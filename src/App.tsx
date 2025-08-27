import { useEffect, useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { AlgorithmPicker } from './components/AlgorithmPicker'
import { ResultsPanel } from './components/ResultsPanel'
import { computeTSP } from './lib/tsp'
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
  const canCompute = pins.length >= 4

  const coords = useMemo(() => pins.map((p: Pin) => [p.lng, p.lat] as [number, number]), [pins])

  async function handleCompute() {
    if (!canCompute) return
    // Use OSRM table to get road-aware duration/distance matrix
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
  }, [best, coords])

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
                { id: `${Date.now()}-${prev.length}`, lat, lng, label: prev.length === 0 ? 'Source' : `P${prev.length}` },
              ])
            }
            polyline={polyline}
          />
        </div>
        <div className="right">
          <AlgorithmPicker selected={algos} onChange={setAlgos} canCompute={canCompute} onCompute={handleCompute} />
          <ResultsPanel results={results} />
        </div>
      </main>
      <footer>
        <small>Map tiles © OpenStreetMap contributors, rendered by OSM</small>
      </footer>
    </div>
  )
}

export default App
