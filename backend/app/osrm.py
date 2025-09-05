import os
from typing import List, Tuple, Dict, Any
import httpx
import math

OSRM_BASE = os.getenv("OSRM_BASE", "https://router.project-osrm.org")

async def osrm_table(coords: List[Tuple[float, float]], profile: str = "driving") -> Dict[str, Any]:
    coords_q = ";".join([f"{lng},{lat}" for lng, lat in coords])
    url = f"{OSRM_BASE}/table/v1/{profile}/{coords_q}?annotations=duration,distance"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        if r.status_code == 200:
            data = r.json()
            return {"durations": data.get("durations"), "distances": data.get("distances")}
    # fallback
    return haversine_matrix(coords)

async def osrm_route(coords: List[Tuple[float, float]], profile: str = "driving") -> List[Tuple[float, float]]:
    coords_q = ";".join([f"{lng},{lat}" for lng, lat in coords])
    url = f"{OSRM_BASE}/route/v1/{profile}/{coords_q}?overview=full&geometries=geojson"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        if r.status_code == 200:
            data = r.json()
            coords_geo = data["routes"][0]["geometry"]["coordinates"]
            return [(latlng[1], latlng[0]) for latlng in coords_geo]  # return as (lat, lng)
    # straight-line fallback
    return [(lat, lng) for (lng, lat) in coords]

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
