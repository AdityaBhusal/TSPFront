import type { Matrix } from "../App";

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:8000';

const osrmCache = new Map<string, any>();
const CACHE_SIZE_LIMIT = 100;
const DEFAULT_OSRM_BASE = 'https://router.project-osrm.org'
const OSRM_BASE = (import.meta as any)?.env?.VITE_OSRM_BASE || DEFAULT_OSRM_BASE

function getCacheKey(coords: [number, number][], type: string): string {
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
  if (osrmCache.size >= CACHE_SIZE_LIMIT) {
    const keysToRemove = Array.from(osrmCache.keys()).slice(0, 20);
    keysToRemove.forEach(k => osrmCache.delete(k));
  }
  osrmCache.set(key, value);
}

export async function osrmMatrix(coords: [number, number][]): Promise<Matrix> {
  const cacheKey = getCacheKey(coords, 'matrix');
  const cached = getFromCache<Matrix>(cacheKey);
  if (cached) {
    console.log(`Using cached OSRM matrix for ${coords.length} points`);
    return cached;
  }

  console.log(`Requesting OSRM matrix for ${coords.length} points`);

  const res = await fetch(`${API_BASE}/api/osrm/table`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: coords,
      profile: 'driving'
    })
  });
  
  if (!res.ok) throw new Error(`Backend failed: ${res.status}`);
  const data = await res.json();
  
  if (!data?.durations || !data?.distances)
    throw new Error("OSRM matrix missing fields");

  const n = coords.length;
  if (data.durations.length !== n || data.distances.length !== n) {
    throw new Error("OSRM matrix size mismatch");
  }

  console.log(`OSRM matrix received: ${data.durations.length}x${data.durations.length}`);
  const result = { durations: data.durations, distances: data.distances };
  setCache(cacheKey, result);
  return result;
}

export async function osrmRoute(coords: [number, number][]) {
  const cacheKey = getCacheKey(coords, 'route');
  const cached = getFromCache<[number, number][]>(cacheKey);
  if (cached) {
    console.log(`Using cached OSRM route for ${coords.length} points`);
    return cached;
  }

  const res = await fetch(`${API_BASE}/api/osrm/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: coords,
      profile: 'driving'
    })
  });
  
  if (!res.ok) throw new Error(`Backend failed: ${res.status}`);
  const data = await res.json();
  
  if (!data?.coordinates || !Array.isArray(data.coordinates)) {
    throw new Error("Invalid route response");
  }
  
  const result = data.coordinates as [number, number][];
  setCache(cacheKey, result);
  return result;
}

export async function osrmNearest(lat: number, lon: number) {
  console.warn("Road snapping not implemented, using original coordinates");
  return [lat, lon] as [number, number];
}
