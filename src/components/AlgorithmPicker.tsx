import type { AlgoKey } from '../App'
import type React from 'react'
import { Cog6ToothIcon, ClockIcon, PlayIcon } from '@heroicons/react/24/outline'

type Props = {
  selected: AlgoKey[]
  onChange: (algos: AlgoKey[]) => void
  canCompute: boolean
  onCompute: () => void
  benchmarkMode: boolean
  onBenchmarkModeChange: (enabled: boolean) => void
  timeout: number
  onTimeoutChange: (seconds: number) => void
  pinCount: number
  // Genetic tuning UI
  geneticMode: 'auto' | 'pro'
  onGeneticModeChange: (mode: 'auto' | 'pro') => void
  geneticOptions: {
    population: number
    generations: number
    mutationRate: number
    crossoverRate: number
    eliteFraction: number
    tournamentSize: number
  }
  onGeneticOptionsChange: (opts: Partial<Props['geneticOptions']>) => void
}

const labels: Record<AlgoKey, string> = {
  brute_force: 'Brute Force',
  nearest_neighbor: 'Nearest Neighbor',
  genetic: 'Genetic',
}

const descriptions: Record<AlgoKey, string> = {
  brute_force: 'Exhaustive search - optimal but slow (max 11 points)',
  nearest_neighbor: 'Fast greedy heuristic',
  genetic: 'Evolutionary algorithm - good for small problems (<50 points)',
}

export function AlgorithmPicker({ 
  selected, 
  onChange, 
  canCompute, 
  onCompute,
  benchmarkMode,
  onBenchmarkModeChange,
  timeout,
  onTimeoutChange,
  pinCount
  , geneticMode, onGeneticModeChange, geneticOptions, onGeneticOptionsChange
}: Props) {
  function toggleAlgo(algo: AlgoKey) {
    if (selected.includes(algo)) {
      onChange(selected.filter(a => a !== algo))
    } else {
      onChange([...selected, algo])
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Cog6ToothIcon className="w-5 h-5 text-gray-600" aria-hidden />
        <span>Algorithm Configuration</span>
      </h3>
      
      {canCompute ? (
        <div className="space-y-4">
          {/* Algorithm Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Algorithms to Run:
            </label>
            <div className="space-y-2">
              {(Object.keys(labels) as AlgoKey[]).map((algo) => {
                const isBruteForce = algo === 'brute_force'
                const tooManyPoints = isBruteForce && pinCount > 11
                return (
                  <label 
                    key={algo}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                      tooManyPoints 
                        ? 'bg-red-50 border-red-300 opacity-60 cursor-not-allowed'
                        : selected.includes(algo)
                        ? 'bg-primary-50 border-primary-500 shadow-sm cursor-pointer'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(algo)}
                      onChange={() => !tooManyPoints && toggleAlgo(algo)}
                      disabled={tooManyPoints}
                      className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {labels[algo]}
                        {tooManyPoints && (
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                            Too many points
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{descriptions[algo]}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Benchmark Mode Toggle */}
          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-center gap-3 p-3 rounded-md bg-white border border-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={benchmarkMode}
                onChange={(e) => onBenchmarkModeChange(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Benchmark Mode</div>
                <div className="text-xs text-gray-600">Measure and compare execution times</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ClockIcon className="w-4 h-4 text-gray-500" aria-hidden />
                <span>Timer</span>
              </div>
            </label>
          </div>

          {/* Timeout Setting */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Timeout (seconds):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="300"
                value={timeout}
                onChange={(e) => onTimeoutChange(Math.max(1, parseInt(e.target.value) || 30))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">max: 5 min</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Algorithms will be terminated if they exceed this time
            </p>
          </div>

          {/* Compute Button */}
          <button
            onClick={onCompute}
            disabled={selected.length === 0}
            aria-disabled={selected.length === 0}
            title={selected.length === 0 ? 'Select at least one algorithm' : undefined}
            className={`w-full py-3 px-6 rounded-md font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              selected.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <PlayIcon className="w-5 h-5" aria-hidden />
            <span>{benchmarkMode ? 'Run Benchmark' : 'Compute Routes'}</span>
          </button>
          
          {/* Genetic mode / pro settings */}
          {selected.includes('genetic') && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">Genetic Mode</div>
                  <div className="text-xs text-gray-500">Automatic adaptive params or Pro (manual) tuning</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onGeneticModeChange('auto')}
                    className={`px-3 py-1 rounded-md text-sm ${geneticMode === 'auto' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >Auto</button>
                  <button
                    onClick={() => onGeneticModeChange('pro')}
                    className={`px-3 py-1 rounded-md text-sm ${geneticMode === 'pro' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >Pro</button>
                </div>
              </label>

              {geneticMode === 'pro' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Population</label>
                    <input type="number" min={10} max={2000} value={geneticOptions.population}
                      onChange={(e) => onGeneticOptionsChange({ population: Math.max(10, Math.min(2000, parseInt(e.target.value || '10'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Generations</label>
                    <input type="number" min={1} max={5000} value={geneticOptions.generations}
                      onChange={(e) => onGeneticOptionsChange({ generations: Math.max(1, Math.min(5000, parseInt(e.target.value || '50'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Mutation Rate</label>
                    <input type="number" step="0.01" min={0} max={1} value={geneticOptions.mutationRate}
                      onChange={(e) => onGeneticOptionsChange({ mutationRate: Math.max(0, Math.min(1, parseFloat(e.target.value || '0.2'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Crossover Rate</label>
                    <input type="number" step="0.01" min={0} max={1} value={geneticOptions.crossoverRate}
                      onChange={(e) => onGeneticOptionsChange({ crossoverRate: Math.max(0, Math.min(1, parseFloat(e.target.value || '0.8'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Elite Fraction</label>
                    <input type="number" step="0.01" min={0} max={0.9} value={geneticOptions.eliteFraction}
                      onChange={(e) => onGeneticOptionsChange({ eliteFraction: Math.max(0, Math.min(0.9, parseFloat(e.target.value || '0.2'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Tournament Size</label>
                    <input type="number" min={2} max={100} value={geneticOptions.tournamentSize}
                      onChange={(e) => onGeneticOptionsChange({ tournamentSize: Math.max(2, Math.min(100, parseInt(e.target.value || '5'))) })}
                      className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
              )}
            </div>
          )}

          {selected.length === 0 && (
            <p className="text-sm text-primary-600 text-center">
                Select at least one algorithm
              </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 font-medium">
            Add at least 3 pins on the map
          </p>
          <p className="text-sm text-gray-500 mt-1">
            First pin is the starting point
          </p>
        </div>
      )}
    </section>
  )
}
