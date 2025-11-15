// Minimal OSRM helpers using the public demo server. For production, run your own OSRM instance.

import type { Matrix } from "../App";

const PUBLIC_OSRM = "https://router.project-osrm.org";
const LOCAL_OSRM = "http://localhost:5000";

const DEFAULT_OSRM_BASE = (() => {
  const userDefined = (import.meta as any)?.env?.VITE_OSRM_BASE;
  if (userDefined) return userDefined;

  // Always use public OSRM unless explicitly overridden
  // (localhost:5000 is our FastAPI backend, not OSRM)
  return PUBLIC_OSRM;
})();

const OSRM_BASE = DEFAULT_OSRM_BASE;

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
  const coordsStr = coords.map((c) => c.join(",")).join(";");
  const url = `${OSRM_BASE}/table/v1/driving/${coordsStr}?annotations=duration,distance`;

  console.log(`Requesting OSRM matrix for ${coords.length} points`);

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
    return { durations: data.durations, distances: data.distances };
  } catch (err) {
    console.warn("OSRM request failed, using fallback:", err);
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
    return { durations, distances };
  }
}

export async function osrmRoute(coords: [number, number][]) {
  const coordsStr = coords.map((c) => c.join(",")).join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);
    const data = await res.json();
    const geometry = data.routes?.[0]?.geometry;
    if (!geometry) return [] as [number, number][];
    // GeoJSON coords are [lng, lat]; convert to [lat, lng] for Leaflet
    return geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]) as [
      number,
      number
    ][];
  } catch (err) {
    console.warn(
      `OSRM route failed via ${OSRM_BASE}, falling back to straight lines`,
      err
    );
    // Fallback: straight lines in [lat, lng]
    return coords.map((c) => [c[1], c[0]]) as [number, number][];
  }
}

export async function osrmNearest(lat: number, lon: number) {
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
