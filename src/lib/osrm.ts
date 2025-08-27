// Minimal OSRM helpers using the public demo server. For production, run your own OSRM instance.

import type { Matrix } from '../App'

const DEFAULT_OSRM_BASE = 'https://router.project-osrm.org'
const OSRM_BASE = (import.meta as any)?.env?.VITE_OSRM_BASE || DEFAULT_OSRM_BASE

function haversine([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // meters
}

export async function osrmMatrix(coords: [number, number][]): Promise<Matrix> {
  const coordsStr = coords.map((c) => c.join(',')).join(';')
  const url = `${OSRM_BASE}/table/v1/driving/${coordsStr}?annotations=duration,distance`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OSRM matrix failed: ${res.status}`)
    const data = await res.json()
    if (!data?.durations || !data?.distances) throw new Error('OSRM matrix missing fields')
    return { durations: data.durations, distances: data.distances }
  } catch {
    // Fallback: straight-line distances, rough driving time at 35 km/h
    const n = coords.length
    const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    const durations: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    const speed = 35_000 / 3600 // meters per second
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const d = haversine(coords[i], coords[j])
        distances[i][j] = d
        durations[i][j] = d / speed
      }
    }
    return { durations, distances }
  }
}

export async function osrmRoute(coords: [number, number][]) {
  const coordsStr = coords.map((c) => c.join(',')).join(';')
  const url = `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`)
    const data = await res.json()
    const geometry = data.routes?.[0]?.geometry
    if (!geometry) return [] as [number, number][]
    // GeoJSON coords are [lng, lat]; convert to [lat, lng] for Leaflet
    return geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]) as [number, number][]
  } catch {
    // Fallback: straight lines in [lat, lng]
    return coords.map((c) => [c[1], c[0]]) as [number, number][]
  }
}
