import { useEffect, useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { AlgorithmPicker } from './components/AlgorithmPicker'
import { ResultsPanel } from './components/ResultsPanel'
import { StopsEditor } from './components/StopsEditor'
import { computeTSP } from './lib/tsp'
import { solveTspBackend } from './lib/backend'
import { osrmMatrix, osrmRoute } from './lib/osrm'

export type AlgoKey = 'brute_force' | 'nearest_neighbor' | 'two_opt' | 'genetic'

export type Pin = {
  id: string
  lat: number
  lng: number
  label?: string
}

export type Matrix = {
  durations: number[][] // seconds
  distances: number[][] // meters
}

export type RouteResult = {
  order: number[] // indices into pins, starting at source index 0
  totalDistance: number // meters
  totalDuration: number // seconds
  legs: Array<{ from: number; to: number; distance: number; duration: number }>
}

function App() {
  const [pins, setPins] = useState<Pin[]>([])
  const [algos, setAlgos] = useState<AlgoKey[]>(['nearest_neighbor'])
  const [results, setResults] = useState<Record<AlgoKey, RouteResult | null>>({
    brute_force: null,
    nearest_neighbor: null,
    two_opt: null,
    genetic: null,
  })
  const canCompute = pins.length >= 3

  const coords = useMemo(() => pins.map((p: Pin) => [p.lng, p.lat] as [number, number]), [pins])

  async function handleCompute() {
    if (!canCompute) return
    // Prefer backend if configured, otherwise fall back to client-side compute
    const apiBase = (import.meta as any).env?.VITE_API_BASE
    if (apiBase) {
      try {
        const resp = await solveTspBackend({ coordinates: coords, sourceIndex: 0, algorithms: algos })
        const mapped: typeof results = {
          brute_force: (resp.solutions as any)['brute_force'] ?? null,
          nearest_neighbor: (resp.solutions as any)['nearest_neighbor'] ?? null,
          two_opt: (resp.solutions as any)['two_opt'] ?? null,
          genetic: (resp.solutions as any)['genetic'] ?? null,
        }
        setResults(mapped)
        const bestLine = resp.polylines?.best?.coordinates as [number, number][] | undefined
        if (bestLine && bestLine.length) {
          setPolyline(bestLine.map(([lng, lat]) => [lat, lng]))
        } else {
          setPolyline(undefined)
        }
        return
      } catch (e) {
        // fall through to client-side calculation
        console.warn('Backend compute failed, using client fallback', e)
      }
    }
    // Client-side fallback: OSRM table + algorithms in browser
    const matrix: Matrix = await osrmMatrix(coords)
    const next: typeof results = { ...results }
    for (const algo of algos) {
      next[algo] = computeTSP(algo, matrix)
    }
    setResults(next)
  }

  const best = useMemo((): [AlgoKey, RouteResult] | null => {
    const items = (Object.entries(results) as Array<[AlgoKey, RouteResult | null]>).filter(
      (e): e is [AlgoKey, RouteResult] => e[1] !== null
    )
    if (!items.length) return null
    return items.reduce((a, b) => (a[1].totalDuration <= b[1].totalDuration ? a : b)) as [AlgoKey, RouteResult]
  }, [results])
  const [polyline, setPolyline] = useState<[number, number][] | undefined>()
  useEffect(() => {
    let aborted = false
    async function run() {
      if (!best) return setPolyline(undefined)
      // If a backend-provided polyline is already set, skip fetching
      if (polyline && polyline.length) return
      const ordered = best[1].order.map((i: number) => coords[i])
      try {
        const route = await osrmRoute(ordered)
        if (!aborted) setPolyline(route)
      } catch {
        if (!aborted) setPolyline(undefined)
      }
    }
    run()
    return () => { aborted = true }
  }, [best, coords, polyline])

  return (
    <div className="app">
      <header>
        <h1>TSP Map Prototype</h1>
      </header>
      <main>
        <div className="left">
          <MapView
            pins={pins}
            onAddPin={(lat, lng) =>
              setPins((prev: Pin[]) => [
                ...prev,
                { id: `${Date.now()}-${prev.length}`, lat, lng, label: prev.length === 0 ? 'Source' : `Stop ${prev.length}` },
              ])
            }
            polyline={polyline}
          />
        </div>
        <div className="right">
          <StopsEditor
            pins={pins}
            onRename={(index, name) =>
              setPins((prev) => prev.map((p, i) => (i === index ? { ...p, label: name } : p)))
            }
          />
          <AlgorithmPicker selected={algos} onChange={setAlgos} canCompute={canCompute} onCompute={handleCompute} />
          <ResultsPanel results={results} pins={pins} />
        </div>
      </main>
      <footer>
        <small>Map tiles © OpenStreetMap contributors, rendered by OSM</small>
      </footer>
    </div>
  )
}

export default App
