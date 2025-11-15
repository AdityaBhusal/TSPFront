import { useEffect, useMemo, useState } from 'react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { MapView } from './components/MapView'
import { AlgorithmPicker } from './components/AlgorithmPicker'
import { ResultsPanel } from './components/ResultsPanel'
import { StopsEditor } from './components/StopsEditor'
import { computeTSP } from './lib/tsp'
import { solveTspBackend } from './lib/backend'
import { osrmMatrix, osrmRoute, osrmNearest } from './lib/osrm'

export type AlgoKey = 'brute_force' | 'nearest_neighbor' | 'genetic'

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
  executionTime?: number // milliseconds
}

function App() {
  const [pins, setPins] = useState<Pin[]>([])
  const [algos, setAlgos] = useState<AlgoKey[]>(['nearest_neighbor'])
  const [benchmarkMode, setBenchmarkMode] = useState(false)
  const [enableRoadSnapping, setEnableRoadSnapping] = useState(false) // Disabled by default to save OSRM requests
  const [timeout, setTimeout] = useState(30)
  const [geneticMode, setGeneticMode] = useState<'auto' | 'pro'>('auto')
  const [geneticOptions, setGeneticOptions] = useState({
    population: 80,
    generations: 150,
    mutationRate: 0.2,
    crossoverRate: 0.8,
    eliteFraction: 0.2,
    tournamentSize: 5,
  })
  const [selectedAlgoForMap, setSelectedAlgoForMap] = useState<AlgoKey | 'best' | null>('best')
  const [warning, setWarning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<AlgoKey, RouteResult | null>>({
    brute_force: null,
    nearest_neighbor: null,
    genetic: null,
  })
  const canCompute = pins.length >= 3

  const coords = useMemo(() => pins.map((p: Pin) => [p.lng, p.lat] as [number, number]), [pins])

  async function handleCompute() {
    if (!canCompute) return
    setWarning(null)
    const startTime = performance.now()
    
    // Road snapping is now optional to reduce OSRM requests (saves N requests per compute)
    let snapSuccessful = false
    if (enableRoadSnapping) {
      try {
        const snapped = await Promise.all(pins.map(async (p) => {
          try {
            const [sLat, sLng] = await osrmNearest(p.lat, p.lng)
            return { ...p, lat: sLat, lng: sLng }
          } catch {
            return p
          }
        }))

        snapSuccessful = snapped.some((s, i) => s.lat !== pins[i].lat || s.lng !== pins[i].lng)
        
        if (snapSuccessful) {
          setPins(snapped)
        }
      } catch (err) {
        console.warn('Snapping to road failed, continuing with original pins', err)
      }
      
      if (!snapSuccessful) {
        console.info('Road snapping skipped or failed - using original pin coordinates.')
      }
    } else {
      console.info('Road snapping disabled - using original pin coordinates to reduce OSRM requests.')
    }
    
    // Check if brute force is selected with too many points
    if (algos.includes('brute_force') && pins.length > 11) {
      setWarning(`Brute Force skipped: Too many points (${pins.length}). Maximum is 11 points due to factorial complexity O(n!).`)
    }
    
    const apiBase = (import.meta as any).env?.VITE_API_BASE
    if (apiBase && geneticMode === 'auto') {
      try {
        const resp = await solveTspBackend({ coordinates: coords, sourceIndex: 0, algorithms: algos })
        const mapped: typeof results = {
          brute_force: (resp.solutions as any)['brute_force'] ?? null,
          nearest_neighbor: (resp.solutions as any)['nearest_neighbor'] ?? null,
          genetic: (resp.solutions as any)['genetic'] ?? null,
        }
        
        if (benchmarkMode) {
          Object.keys(mapped).forEach(key => {
            const solution = mapped[key as AlgoKey]
            if (solution) {
              solution.executionTime = solution.executionTime ?? (performance.now() - startTime)
            }
          })
        }
        
        setResults(mapped)
        
        updatePolylineFromResults(mapped, resp.polylines?.best?.coordinates as [number, number][] | undefined)
        return
      } catch (e) {
        console.warn('Backend compute failed, using client fallback', e)
      }
    }
    
    const matrix: Matrix = await osrmMatrix(coords)
    
    if (matrix.distances.length !== pins.length || matrix.durations.length !== pins.length) {
      console.error('Matrix size mismatch:', {
        matrixSize: matrix.distances.length,
        pinsCount: pins.length,
        coords: coords.length
      })
      setWarning(`Error: Matrix size mismatch. Expected ${pins.length} nodes but got ${matrix.distances.length}. Try refreshing.`)
      return
    }
    
    const next: typeof results = { ...results }
    
    for (const algo of algos) {
      const algoStartTime = performance.now()
      try {
        if (algo === 'genetic') {
          next[algo] = computeTSP(algo, matrix, geneticMode === 'pro' ? { options: geneticOptions } : undefined)
        } else {
          next[algo] = computeTSP(algo, matrix)
        }
        if (benchmarkMode && next[algo]) {
          next[algo]!.executionTime = performance.now() - algoStartTime
        }
      } catch (error) {
        console.error(`Error running ${algo}:`, error)
        next[algo] = null
        setWarning(`${algo} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    setResults(next)
    updatePolylineFromResults(next)
  }

  function updatePolylineFromResults(resultsData: typeof results, backendPolyline?: [number, number][]) {
    if (backendPolyline && backendPolyline.length) {
      setPolyline(backendPolyline.map(([lng, lat]) => [lat, lng]))
      return
    }
    
    const targetAlgo = selectedAlgoForMap === 'best' ? best?.[0] : selectedAlgoForMap
    if (targetAlgo && resultsData[targetAlgo]) {
      fetchPolylineForAlgo(targetAlgo, resultsData)
    }
  }

  async function fetchPolylineForAlgo(algo: AlgoKey, resultsData: typeof results) {
    const result = resultsData[algo]
    if (!result) return
    
    const ordered = result.order.map((i: number) => coords[i])
    try {
      const route = await osrmRoute(ordered)
      setPolyline(route)
    } catch {
      setPolyline(undefined)
    }
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
      const targetAlgo = selectedAlgoForMap === 'best' ? best?.[0] : selectedAlgoForMap
      if (!targetAlgo) {
        setPolyline(undefined)
        return
      }
      
      const result = results[targetAlgo]
      if (!result) {
        setPolyline(undefined)
        return
      }
      
      const ordered = result.order.map((i: number) => coords[i])
      try {
        const route = await osrmRoute(ordered)
        if (!aborted) setPolyline(route)
      } catch {
        if (!aborted) setPolyline(undefined)
      }
    }
    run()
    return () => { aborted = true }
  }, [selectedAlgoForMap, results, best, coords])

  function handleRemovePin(index: number) {
    if (index === 0) return // Don't allow removing the start pin
    setPins(prev => prev.filter((_, i) => i !== index))
    // Clear results when pins change
    setResults({
      brute_force: null,
      nearest_neighbor: null,
      genetic: null,
    })
    setPolyline(undefined)
  }

  function handleClearPins() {
    setPins([])
    setResults({
      brute_force: null,
      nearest_neighbor: null,
      genetic: null,
    })
    setPolyline(undefined)
  }

  function handleAddRandomPoints(count: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    const generated: Pin[] = []
    for (let i = 0; i < count; i++) {
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat)
      const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng)
      const currentIndex = pins.length + i
      generated.push({
        id: `${Date.now()}-${currentIndex}-${Math.random()}`,
        lat,
        lng,
        label: currentIndex === 0 ? 'Start' : `Stop ${currentIndex}`
      })
    }
    setPins(prev => [...prev, ...generated])
    // Clear results when pins change
    setResults({ brute_force: null, nearest_neighbor: null, genetic: null })
    setPolyline(undefined)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <MapPinIcon className="w-6 h-6 text-primary-600" aria-hidden />
            <span>TSP Solver & Benchmark Tool</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Visualize and compare Traveling Salesman Problem algorithms
          </p>
        </div>
      </header>
      
      {/* Warning Banner */}
        {warning && (
          <div className="container mx-auto px-4 pt-4">
            <div className="bg-warning-50 border-l-4 border-warning-400 p-4 rounded-r-lg flex items-start gap-3">
              <div className="flex-1">
                <p className="text-warning-800 font-medium">{warning}</p>
              </div>
              <button
                onClick={() => setWarning(null)}
                className="text-warning-600 hover:text-warning-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      
      <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-[600px]">
          <MapView
            pins={pins}
            onAddPin={(lat, lng) =>
              setPins((prev: Pin[]) => [
                ...prev,
                { 
                  id: `${Date.now()}-${prev.length}`, 
                  lat, 
                  lng, 
                  label: prev.length === 0 ? 'Start' : `Stop ${prev.length}` 
                },
              ])
            }
            polyline={polyline}
            selectedAlgo={selectedAlgoForMap}
          />
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          <StopsEditor
            pins={pins}
            onRename={(index, name) =>
              setPins((prev) => prev.map((p, i) => (i === index ? { ...p, label: name } : p)))
            }
            onRemove={handleRemovePin}
            onClear={handleClearPins}
            onAddRandomPoints={handleAddRandomPoints}
          />
          
          <AlgorithmPicker 
            selected={algos} 
            onChange={setAlgos} 
            canCompute={canCompute} 
            onCompute={handleCompute}
            benchmarkMode={benchmarkMode}
            onBenchmarkModeChange={setBenchmarkMode}
            enableRoadSnapping={enableRoadSnapping}
            onEnableRoadSnappingChange={setEnableRoadSnapping}
            timeout={timeout}
            onTimeoutChange={setTimeout}
            pinCount={pins.length}
            geneticMode={geneticMode}
            onGeneticModeChange={setGeneticMode}
            geneticOptions={geneticOptions}
            onGeneticOptionsChange={(opts) => setGeneticOptions(prev => ({ ...prev, ...(opts || {}) }))}
          />
          
          <ResultsPanel 
            results={results} 
            pins={pins}
            benchmarkMode={benchmarkMode}
            selectedAlgoForMap={selectedAlgoForMap}
            onSelectAlgoForMap={setSelectedAlgoForMap}
          />
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-3 text-center">
          <p className="text-sm text-gray-600">
            Map tiles © <a href="https://www.openstreetmap.org/copyright" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
            {' '} | Routing by <a href="http://project-osrm.org/" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">OSRM</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
