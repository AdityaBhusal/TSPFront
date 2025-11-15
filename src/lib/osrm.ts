// Minimal OSRM helpers. Uses backend as proxy to avoid CORS issues with public OSRM server.

import type { Matrix } from "../App";

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:8000';

// Check if we should use direct OSRM (only if explicitly configured and running locally)
const DIRECT_OSRM = (import.meta as any)?.env?.VITE_OSRM_BASE;
const USE_BACKEND_PROXY = !DIRECT_OSRM || DIRECT_OSRM.includes('router.project-osrm.org');

const OSRM_BASE = DIRECT_OSRM || 'http://localhost:5000';

// Simple in-memory cache to reduce redundant requests
const osrmCache = new Map<string, any>();
const CACHE_SIZE_LIMIT = 100;

function getCacheKey(coords: [number, number][], type: string): string {
  // Round to 6 decimal places (~0.1m precision) for cache key
  const rounded = coords.map(([lng, lat]) => [
    Math.round(lng * 1e6) / 1e6,
    Math.round(lat * 1e6) / 1e6
  ]);
  return `${type}:${JSON.stringify(rounded)}`;
}

function getFromCache<T>(key: string): T | undefined {
  return osrmCache.get(key);
}

function setCache<T>(key: string, value: T): void {
  // Simple cache eviction: remove oldest entries if cache is too large
  if (osrmCache.size >= CACHE_SIZE_LIMIT) {
    const keysToRemove = Array.from(osrmCache.keys()).slice(0, 20);
    keysToRemove.forEach(k => osrmCache.delete(k));
  }
  osrmCache.set(key, value);
}

function haversine(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number]
) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
}

export async function osrmMatrix(coords: [number, number][]): Promise<Matrix> {
  // Check cache first
  const cacheKey = getCacheKey(coords, 'matrix');
  const cached = getFromCache<Matrix>(cacheKey);
  if (cached) {
    console.log(`Using cached OSRM matrix for ${coords.length} points`);
    return cached;
  }

  console.log(`Requesting OSRM matrix for ${coords.length} points`);

  // Use backend proxy to avoid CORS issues
  if (USE_BACKEND_PROXY) {
    try {
      const res = await fetch(`${API_BASE}/api/osrm/table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: coords,
          profile: 'driving'
        })
      });
      
      if (!res.ok) throw new Error(`Backend proxy failed: ${res.status}`);
      const data = await res.json();
      
      if (!data?.durations || !data?.distances)
        throw new Error("OSRM matrix missing fields");

      // Validate matrix dimensions
      const n = coords.length;
      if (data.durations.length !== n || data.distances.length !== n) {
        console.error("OSRM returned wrong size:", {
          expected: n,
          gotDurations: data.durations.length,
          gotDistances: data.distances.length,
        });
        throw new Error("OSRM matrix size mismatch");
      }

      console.log(
        `OSRM matrix received: ${data.durations.length}x${data.durations.length}`
      );
      const result = { durations: data.durations, distances: data.distances };
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn("Backend proxy failed, using fallback:", err);
      // Fall through to fallback
    }
  } else {
    // Direct OSRM access (only for local instances)
    const coordsStr = coords.map((c) => c.join(",")).join(";");
    const url = `${OSRM_BASE}/table/v1/driving/${coordsStr}?annotations=duration,distance`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM matrix failed: ${res.status}`);
      const data = await res.json();
      if (!data?.durations || !data?.distances)
        throw new Error("OSRM matrix missing fields");

      // Validate matrix dimensions
      const n = coords.length;
      if (data.durations.length !== n || data.distances.length !== n) {
        console.error("OSRM returned wrong size:", {
          expected: n,
          gotDurations: data.durations.length,
          gotDistances: data.distances.length,
        });
        throw new Error("OSRM matrix size mismatch");
      }

      console.log(
        `OSRM matrix received: ${data.durations.length}x${data.durations.length}`
      );
      const result = { durations: data.durations, distances: data.distances };
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn("OSRM request failed, using fallback:", err);
      // Fall through to fallback
    }
  }
  
  // Fallback: straight-line distances, rough driving time at 35 km/h
  const n = coords.length;
  const distances: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0)
  );
  const durations: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0)
  );
  const speed = 35_000 / 3600; // meters per second
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = haversine(coords[i], coords[j]);
      distances[i][j] = d;
      durations[i][j] = d / speed;
    }
  }
  console.log(`Fallback matrix created: ${n}x${n}`);
  const result = { durations, distances };
  setCache(cacheKey, result);
  return result;
}

export async function osrmRoute(coords: [number, number][]) {
  // Check cache first
  const cacheKey = getCacheKey(coords, 'route');
  const cached = getFromCache<[number, number][]>(cacheKey);
  if (cached) {
    console.log(`Using cached OSRM route for ${coords.length} points`);
    return cached;
  }

  // Use backend proxy to avoid CORS issues
  if (USE_BACKEND_PROXY) {
    try {
      const res = await fetch(`${API_BASE}/api/osrm/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: coords,
          profile: 'driving'
        })
      });
      
      if (!res.ok) throw new Error(`Backend proxy failed: ${res.status}`);
      const data = await res.json();
      
      if (!data?.coordinates || !Array.isArray(data.coordinates)) {
        throw new Error("Invalid route response");
      }
      
      // Backend returns [(lat, lng), ...], convert to Leaflet format [lat, lng]
      const result = data.coordinates as [number, number][];
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`Backend proxy failed, falling back to straight lines`, err);
      // Fall through to fallback
    }
  } else {
    // Direct OSRM access (only for local instances)
    const coordsStr = coords.map((c) => c.join(",")).join(";");
    const url = `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);
      const data = await res.json();
      const geometry = data.routes?.[0]?.geometry;
      if (!geometry) throw new Error("No geometry in response");
      
      // GeoJSON coords are [lng, lat]; convert to [lat, lng] for Leaflet
      const result = geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]) as [
        number,
        number
      ][];
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`OSRM route failed, falling back to straight lines`, err);
      // Fall through to fallback
    }
  }
  
  // Fallback: straight lines in [lat, lng]
  return coords.map((c) => [c[1], c[0]]) as [number, number][];
}

export async function osrmNearest(lat: number, lon: number) {
  // Note: Road snapping is disabled by default to reduce OSRM requests
  // When enabled, it uses backend proxy to avoid CORS
  
  if (USE_BACKEND_PROXY) {
    // For now, just return original coordinates when using proxy
    // TODO: Add backend endpoint for nearest if needed
    console.warn("Road snapping not available via backend proxy, using original coordinates");
    return [lat, lon] as [number, number];
  }
  
  const url = `${OSRM_BASE}/nearest/v1/driving/${lon},${lat}?number=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM nearest failed: ${res.status}`);
    const data = await res.json();
    const wp = data.waypoints?.[0];
    if (!wp || !wp.location) return [lat, lon] as [number, number];
    // wp.location is [lon, lat]
    return [wp.location[1], wp.location[0]] as [number, number];
  } catch (err) {
    console.warn("OSRM nearest failed, returning original point", err);
    return [lat, lon] as [number, number];
  }
}
