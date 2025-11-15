import os
from typing import List, Tuple, Dict, Any
import httpx
import math
from functools import lru_cache
import hashlib
import json

OSRM_BASE = os.getenv("OSRM_BASE", "https://router.project-osrm.org")

# Simple in-memory cache for OSRM responses
_osrm_cache: Dict[str, Any] = {}
CACHE_SIZE_LIMIT = 100

def _cache_key(coords: List[Tuple[float, float]], profile: str, api_type: str) -> str:
    """Generate a cache key from coordinates and profile."""
    # Round coordinates to 6 decimal places (~0.1m precision) for cache key
    rounded = [(round(lng, 6), round(lat, 6)) for lng, lat in coords]
    data = {"coords": rounded, "profile": profile, "type": api_type}
    return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()

def _get_cache(key: str) -> Any:
    return _osrm_cache.get(key)

def _set_cache(key: str, value: Any):
    # Simple cache eviction: remove oldest entries if cache is too large
    if len(_osrm_cache) >= CACHE_SIZE_LIMIT:
        # Remove first 20 entries
        for k in list(_osrm_cache.keys())[:20]:
            _osrm_cache.pop(k, None)
    _osrm_cache[key] = value

async def osrm_table(coords: List[Tuple[float, float]], profile: str = "driving") -> Dict[str, Any]:
    # Check cache first
    cache_key = _cache_key(coords, profile, "table")
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached
    
    coords_q = ";".join([f"{lng},{lat}" for lng, lat in coords])
    url = f"{OSRM_BASE}/table/v1/{profile}/{coords_q}?annotations=duration,distance"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        if r.status_code == 200:
            data = r.json()
            result = {"durations": data.get("durations"), "distances": data.get("distances")}
            _set_cache(cache_key, result)
            return result
    # fallback
    result = haversine_matrix(coords)
    _set_cache(cache_key, result)
    return result

async def osrm_route(coords: List[Tuple[float, float]], profile: str = "driving") -> List[Tuple[float, float]]:
    # Check cache first
    cache_key = _cache_key(coords, profile, "route")
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached
    
    coords_q = ";".join([f"{lng},{lat}" for lng, lat in coords])
    url = f"{OSRM_BASE}/route/v1/{profile}/{coords_q}?overview=full&geometries=geojson"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        if r.status_code == 200:
            data = r.json()
            coords_geo = data["routes"][0]["geometry"]["coordinates"]
            result = [(latlng[1], latlng[0]) for latlng in coords_geo]  # return as (lat, lng)
            _set_cache(cache_key, result)
            return result
    # straight-line fallback
    result = [(lat, lng) for (lng, lat) in coords]
    return result

def haversine(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    R = 6371000
    lat1, lon1 = a[1] * math.pi/180, a[0] * math.pi/180
    lat2, lon2 = b[1] * math.pi/180, b[0] * math.pi/180
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return 2 * R * math.asin(math.sqrt(h))

def haversine_matrix(coords: List[Tuple[float, float]]) -> Dict[str, Any]:
    n = len(coords)
    distances = [[0.0]*n for _ in range(n)]
    durations = [[0.0]*n for _ in range(n)]
    speed_mps = 13.89  # ~50 km/h
    for i in range(n):
        for j in range(n):
            if i == j: continue
            d = haversine(coords[i], coords[j])
            distances[i][j] = d
            durations[i][j] = d / speed_mps
    return {"durations": durations, "distances": distances}
