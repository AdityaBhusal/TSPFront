import type { Pin } from '../App'
import { useState } from 'react'
import { MapPinIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline'
import { LocationSearch } from './LocationSearch'

type Props = {
  pins: Pin[]
  onRename: (index: number, name: string) => void
  onRemove: (index: number) => void
  onClear: () => void
  onAddRandomPoints: (count: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
  onAddLocationBySearch: (lat: number, lng: number, displayName: string) => void
}

export function StopsEditor({ pins, onRename, onRemove, onClear, onAddRandomPoints, onAddLocationBySearch }: Props) {
  const [randomCount, setRandomCount] = useState(5)
  const [showRandomDialog, setShowRandomDialog] = useState(false)

  // Default bounds (can be adjusted based on the current map view)
  const defaultBounds = {
    // Default to Kathmandu area (Nepal)
    minLat: 27.6,
    maxLat: 27.9,
    minLng: 85.2,
    maxLng: 85.5,
  }

  function handleGenerateRandom() {
    onAddRandomPoints(randomCount, defaultBounds)
    setShowRandomDialog(false)
  }

  if (pins.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-gray-600" aria-hidden />
          <span>Stops Manager</span>
        </h3>

        {/* Location Search */}
        <div className="mb-4">
          <LocationSearch
            onLocationSelect={onAddLocationBySearch}
            placeholder="Search for a location (e.g., Kathmandu, Patan)"
            countryCode="np"
          />
          <p className="text-xs text-gray-500 mt-1">
            Search and add locations by name, or click on the map
          </p>
        </div>

        <div className="text-center py-6">
          <p className="text-gray-600 font-medium">No stops added yet</p>
          <p className="text-sm text-gray-500 mt-1">Click on the map to add pins</p>
        </div>

        {/* Random Points Generator */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowRandomDialog(!showRandomDialog)}
            className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-all flex items-center justify-center gap-2"
            aria-pressed={showRandomDialog}
          >
            <SparklesIcon className="w-4 h-4" aria-hidden />
            <span>Generate Random Points</span>
          </button>

          {showRandomDialog && (
            <div className="mt-3 p-4 bg-white rounded-md border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of points:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="3"
                  max="100"
                  value={randomCount}
                  onChange={(e) => setRandomCount(Math.max(3, Math.min(100, parseInt(e.target.value) || 5)))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={handleGenerateRandom}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">Min: 3, Max: 100 points</p>
            </div>
          )}
        </div>
      </section>
    )
  }
  
  return (
    <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Stops Manager <span className="text-sm font-normal text-gray-500">({pins.length})</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRandomDialog(!showRandomDialog)}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            title="Add random points"
            aria-pressed={showRandomDialog}
          >
            <SparklesIcon className="w-4 h-4" aria-hidden />
            <span>Random</span>
          </button>
            {pins.length > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
              title="Clear all stops"
            >
              <TrashIcon className="w-4 h-4" aria-hidden />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Location Search */}
      <div className="mb-4">
        <LocationSearch
          onLocationSelect={onAddLocationBySearch}
          placeholder="Search for a location (e.g., Kathmandu, Patan)"
          countryCode="np"
        />
        <p className="text-xs text-gray-500 mt-1">
          Search and add locations by name, or click on the map
        </p>
      </div>
      
      {/* Random Points Dialog */}
      {showRandomDialog && (
        <div className="mb-4 p-4 bg-white rounded-md border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Number of random points to add:</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={randomCount}
              onChange={(e) => setRandomCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
                onClick={handleGenerateRandom}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">Will add points in the current map area (max 50)</p>
        </div>
      )}
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {pins.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                i === 0
                  ? 'bg-success-50 border-success-500'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
          >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-success-600 text-white' : 'bg-gray-400 text-white'
                }`}>
                  {i === 0 ? 'S' : i}
                </div>
            
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder={i === 0 ? 'Starting point' : `Stop ${i} name`}
                value={p.label ?? ''}
                onChange={(e) => onRename(i, e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all mb-1"
              />
              <div className="text-xs text-gray-500 px-1">
                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </div>
            </div>
            
            {i > 0 && (
              <button
                onClick={() => onRemove(i)}
                className="flex-shrink-0 px-3 py-1 bg-danger-100 hover:bg-danger-200 text-danger-600 rounded-md transition-colors text-sm flex items-center gap-2"
                title="Remove this stop"
              >
                <TrashIcon className="w-4 h-4" aria-hidden />
                <span>Remove</span>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">Tip: The first pin is your starting point. Click anywhere on the map to add more stops.</p>
      </div>
    </section>
  )
}
