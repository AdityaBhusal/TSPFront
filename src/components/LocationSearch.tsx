import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { searchLocation, formatAddress, type GeocodingResult } from '../lib/geocoding'

type Props = {
  onLocationSelect: (lat: number, lng: number, displayName: string) => void
  placeholder?: string
  countryCode?: string
}

export function LocationSearch({ onLocationSelect, placeholder, countryCode = 'np' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError(null)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchLocation(query, 5, countryCode)
        setResults(searchResults)
        setIsOpen(true)
        setIsLoading(false)
      } catch (err) {
        setError('Failed to search locations. Please try again.')
        setResults([])
        setIsLoading(false)
        console.error('Location search error:', err)
      }
    }, 800) // Wait 800ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, countryCode])

  function handleSelectLocation(result: GeocodingResult) {
    onLocationSelect(result.lat, result.lon, formatAddress(result))
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setError(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
          placeholder={placeholder || 'Search for a location...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-3">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
            Searching...
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
          <ul className="py-1">
            {results.map((result) => (
              <li key={result.place_id}>
                <button
                  onClick={() => handleSelectLocation(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatAddress(result)}
                      </p>
                      {result.display_name !== formatAddress(result) && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {result.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results message */}
      {isOpen && results.length === 0 && !isLoading && query.trim() && !error && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-3">
          <p className="text-sm text-gray-600">No locations found. Try a different search.</p>
        </div>
      )}
    </div>
  )
}
