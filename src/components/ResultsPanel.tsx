import type { AlgoKey, RouteResult, Pin } from '../App'
import { useState } from 'react'
import { ChartBarIcon, StarIcon } from '@heroicons/react/24/outline'

type Props = {
  results: Record<AlgoKey, RouteResult | null>
  pins: Pin[]
  benchmarkMode: boolean
  selectedAlgoForMap: AlgoKey | 'best' | null
  onSelectAlgoForMap: (algo: AlgoKey | 'best' | null) => void
}

// Visual accent (thin left stripe) classes per algorithm
const algoStripe: Record<AlgoKey | 'best', string> = {
  brute_force: 'bg-primary-500',
  nearest_neighbor: 'bg-success-500',
  genetic: 'bg-accent-500',
  best: 'bg-success-500',
}

const algoLabels: Record<AlgoKey, string> = {
  brute_force: 'Brute Force',
  nearest_neighbor: 'Nearest Neighbor',
  genetic: 'Genetic',
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return [h ? `${h}h` : null, m ? `${m}m` : null, s ? `${s}s` : null].filter(Boolean).join(' ') || '0s'
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`
}

function fmtExecTime(ms?: number) {
  if (ms === undefined) return 'N/A'
  if (ms < 1) return '<1 ms'
  if (ms < 1000) return `${ms.toFixed(0)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function ResultsPanel({ results, pins, benchmarkMode, selectedAlgoForMap, onSelectAlgoForMap }: Props) {
  const [expandedAlgo, setExpandedAlgo] = useState<AlgoKey | null>(null)
  
  const entries = Object.entries(results).filter(([, v]) => v) as Array<[AlgoKey, RouteResult]>
  if (entries.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-gray-600" aria-hidden />
          <span>Results</span>
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No results yet</p>
          <p className="text-sm text-gray-500 mt-1">Configure and run algorithms to see results</p>
        </div>
      </section>
    )
  }

  // Find best result
  const bestEntry = entries.reduce((a, b) => 
    a[1].totalDuration <= b[1].totalDuration ? a : b
  )
  const bestAlgo = bestEntry[0]

  return (
    <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Results
        {benchmarkMode && <span className="text-sm font-normal text-primary-600"> (Benchmark Mode)</span>}
      </h3>

      {/* Map Display Selection */}
      <div className="mb-4 p-4 bg-white rounded-md border border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Display on Map:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectAlgoForMap('best')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              selectedAlgoForMap === 'best'
                ? 'bg-success-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Best Result
          </button>
          {entries.map(([algo]) => (
            <button
              key={algo}
              onClick={() => onSelectAlgoForMap(algo)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedAlgoForMap === algo
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              {algoLabels[algo]}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto pr-2">
        {entries.map(([algo, r]) => {
          const isBest = algo === bestAlgo
          const isExpanded = expandedAlgo === algo

          // Build ETA array
          const etaAt: number[] = [0]
          let sum = 0
          for (const leg of r.legs) {
            sum += leg.duration
            etaAt.push(sum)
          }

          return (
            <div key={algo} className="rounded-lg overflow-hidden shadow-sm">
              <div className="flex">
                {/* left color stripe */}
                <div className={`${algoStripe[algo]} w-1`} />

                <div className="flex-1">
                  <div className="p-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setExpandedAlgo(isExpanded ? null : algo)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-gray-900">{algoLabels[algo]}</h4>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-600 text-white text-xs font-bold rounded-full">
                            <StarIcon className="w-3 h-3 text-white" aria-hidden />
                            BEST
                          </span>
                        )}
                      </div>
                      <button className="text-gray-500 hover:text-gray-700">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600 text-xs font-medium">Distance</div>
                        <div className="font-bold text-gray-900">{fmtDist(r.totalDistance)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs font-medium">Duration</div>
                        <div className="font-bold text-gray-900">{fmtTime(r.totalDuration)}</div>
                      </div>
                      {benchmarkMode && r.executionTime !== undefined && (
                        <div className="col-span-2">
                          <div className="text-gray-600 text-xs font-medium">Execution Time</div>
                          <div className="font-bold text-primary-600">{fmtExecTime(r.executionTime)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-300">
                      <div className="mt-3">
                        <div className="font-semibold text-gray-700 mb-2 text-sm">Route Order:</div>
                        <ol className="space-y-2 text-sm">
                          {r.order.map((pinIndex, i) => {
                            const leg = i > 0 ? r.legs[i - 1] : undefined
                            const displayName = pins[pinIndex]?.label ?? `Pin ${pinIndex}`
                            return (
                              <li key={`${pinIndex}-${i}`} className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs font-bold">{i}</span>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{i === 0 ? 'Start: ' : ''}{displayName}</div>
                                  {typeof leg !== 'undefined' && (
                                    <div className="text-xs text-gray-600">→ {fmtDist(leg.distance)} · {fmtTime(leg.duration)}</div>
                                  )}
                                  <div className="text-xs text-gray-500">ETA: {fmtTime(etaAt[i])}</div>
                                </div>
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Benchmark Summary */}
      {benchmarkMode && entries.length > 1 && (
        <div className="mt-4 p-4 bg-white rounded-md border border-accent-100">
          <h4 className="font-bold text-gray-900 mb-2">Benchmark Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Best Quality:</span>
              <span className="font-bold text-success-600">{algoLabels[bestAlgo]}</span>
            </div>
            {entries.every(([, r]) => r.executionTime !== undefined) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fastest:</span>
                <span className="font-bold text-primary-600">
                  {algoLabels[
                    entries.reduce((a, b) => 
                      (a[1].executionTime ?? Infinity) < (b[1].executionTime ?? Infinity) ? a : b
                    )[0]
                  ]}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
