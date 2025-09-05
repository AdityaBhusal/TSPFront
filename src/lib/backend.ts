const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export type BackendSolveRequest = {
  coordinates: [number, number][] // [lng, lat]
  sourceIndex: number
  algorithms: string[]
  profile?: 'driving' | 'foot' | 'bike'
}

export type BackendLeg = { from: number; to: number; distance: number; duration: number }
export type BackendSolution = {
  order: number[]
  totalDistance: number
  totalDuration: number
  legs: BackendLeg[]
}

export type BackendSolveResponse = {
  matrix: { durations: number[][]; distances: number[][] }
  solutions: Record<string, BackendSolution | null>
  polylines?: { best?: { type: 'LineString'; coordinates: [number, number][] } }
}

export async function solveTspBackend(payload: BackendSolveRequest): Promise<BackendSolveResponse> {
  const res = await fetch(`${BASE}/api/tsp/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error ${res.status}: ${text}`)
  }
  return res.json()
}
