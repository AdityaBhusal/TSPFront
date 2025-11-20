import { useState, useEffect, useMemo, useRef } from 'react'
import { MapView } from '../components/MapView'
import { StopsEditor } from '../components/StopsEditor'
import { computeTSP } from '../lib/tsp'
import { osrmMatrix, osrmRoute } from '../lib/osrm'
import { 
  TruckIcon, 
  ClockIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import type { Pin, Matrix, RouteResult } from '../App'
import { useSettings } from '../context/SettingsContext'

export function LogisticsView() {
  const { settings } = useSettings()
  const [pins, setPins] = useState<Pin[]>([])
  const [polyline, setPolyline] = useState<[number, number][] | undefined>()
  const [result, setResult] = useState<RouteResult | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [completedStops, setCompletedStops] = useState<Map<number, Date>>(new Map())
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState<string>('09:00')
  const [deliveryNotes, setDeliveryNotes] = useState<Record<number, string>>({})
  const scheduleContainerRef = useRef<HTMLDivElement>(null)
  
  const coords = useMemo(() => pins.map((p: Pin) => [p.lng, p.lat] as [number, number]), [pins])
  const canCompute = pins.length >= 3

  useEffect(() => {
    if (result && scheduleContainerRef.current) {
      scheduleContainerRef.current.scrollTop = 0
    }
  }, [result])

  const scheduledTimes = useMemo(() => {
    if (!result) return {}
    const schedule: Record<number, { arrival: Date; departure: Date }> = {}
    let currentTime = new Date(`${deliveryDate}T${startTime}`)

    result.order.forEach((pinIdx, i) => {
      if (i === 0) {
        const departureTime = new Date(currentTime.getTime() + settings.stopWaitingTime * 60 * 1000)
        schedule[pinIdx] = { arrival: currentTime, departure: departureTime }
        currentTime = departureTime
      } else {
        const prevPinIdx = result.order[i - 1]
        const leg = result.legs.find(l => l.from === prevPinIdx && l.to === pinIdx)
        if (leg) {
          const travelTime = leg.duration * 1000
          const arrivalTime = new Date(currentTime.getTime() + travelTime)
          const departureTime = new Date(arrivalTime.getTime() + settings.stopWaitingTime * 60 * 1000)
          schedule[pinIdx] = { arrival: arrivalTime, departure: departureTime }
          currentTime = departureTime
        }
      }
    })
    return schedule
  }, [result, deliveryDate, startTime, settings.stopWaitingTime])

  const estimatedTimes = useMemo(() => {
    if (!result) return {}

    const estimates: Record<number, { arrival: Date; departure: Date }> = {}
    let lastDepartureTime: Date | null = null
    let lastPinIdx: number | null = null

    let lastCompletedIndexInOrder = -1
    result.order.forEach((pinIdx, i) => {
      if (completedStops.has(pinIdx)) {
        lastCompletedIndexInOrder = i
      }
    })

    if (lastCompletedIndexInOrder !== -1) {
      const lastCompletedPinIdx = result.order[lastCompletedIndexInOrder]
      lastDepartureTime = completedStops.get(lastCompletedPinIdx)!
      lastPinIdx = lastCompletedPinIdx
    } else {
      const startPinIdx = result.order[0]
      if (scheduledTimes[startPinIdx]) {
        lastDepartureTime = scheduledTimes[startPinIdx].departure
        lastPinIdx = startPinIdx
      }
    }

    result.order.forEach((pinIdx) => {
      const scheduled = scheduledTimes[pinIdx]
      if (!scheduled) return

      if (completedStops.has(pinIdx)) {
        estimates[pinIdx] = {
          arrival: scheduled.arrival,
          departure: completedStops.get(pinIdx)!,
        }
      } else {
        if (lastPinIdx !== null && lastDepartureTime !== null) {
          const leg = result.legs.find(l => l.from === lastPinIdx && l.to === pinIdx)
          if (leg) {
            const travelTime = leg.duration * 1000
            const arrivalTime = new Date(lastDepartureTime.getTime() + travelTime)
            const departureTime = new Date(arrivalTime.getTime() + settings.stopWaitingTime * 60 * 1000)
            estimates[pinIdx] = { arrival: arrivalTime, departure: departureTime }
            
            lastDepartureTime = departureTime
            lastPinIdx = pinIdx
          } else {
            estimates[pinIdx] = scheduled
            lastDepartureTime = scheduled.departure
            lastPinIdx = pinIdx
          }
        } else {
          estimates[pinIdx] = scheduled
        }
      }
    })

    return estimates
  }, [result, scheduledTimes, completedStops, settings.stopWaitingTime])

  const performanceStats = useMemo(() => {
    if (completedStops.size === 0 || !result) {
      return { timeDifference: 0, scheduledFinish: null, estimatedFinish: null, actualFinish: null, allCompleted: false }
    }

    let totalDifference = 0
    completedStops.forEach((completionTime, pinIdx) => {
      const scheduledTime = scheduledTimes[pinIdx]?.arrival
      if (scheduledTime) {
        totalDifference += scheduledTime.getTime() - completionTime.getTime()
      }
    })

    const lastPinInOrder = result.order[result.order.length - 1]
    const scheduledFinish = scheduledTimes[lastPinInOrder]?.arrival
    const estimatedFinish = estimatedTimes[lastPinInOrder]?.arrival
    const allCompleted = completedStops.size === result.order.length
    const actualFinish = allCompleted ? completedStops.get(lastPinInOrder) : null

    return { timeDifference: totalDifference / 1000, scheduledFinish, estimatedFinish, actualFinish, allCompleted }
  }, [completedStops, scheduledTimes, estimatedTimes, result])

  const remainingStops = useMemo(() => {
    return pins.filter((_, idx) => !completedStops.has(idx))
  }, [pins, completedStops])

  const fuelCost = useMemo(() => {
    if (!result || !result.totalDistance) return 0
    const distanceKm = result.totalDistance / 1000
    const litersUsed = distanceKm / settings.fuelEfficiency
    return litersUsed * settings.fuelPricePerLiter
  }, [result, settings])

  const formattedFuelCost = useMemo(() => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: settings.currency,
    }).format(fuelCost)
  }, [fuelCost, settings.currency])

  async function handleOptimizeRoute() {
    if (!canCompute) return
    setIsComputing(true)
    
    try {
      const matrix: Matrix = await osrmMatrix(coords)
      const optimized = computeTSP('nearest_neighbor', matrix)
      
      if (optimized) {
        setResult(optimized)
        const ordered = optimized.order.map((i: number) => coords[i])
        const route = await osrmRoute(ordered)
        setPolyline(route)
      }
    } catch (error) {
      console.error('Route optimization failed:', error)
    } finally {
      setIsComputing(false)
    }
  }

  function handleMarkCompleted(index: number) {
    setCompletedStops(prev => {
      const next = new Map(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.set(index, new Date())
      }
      return next
    })
  }

  function handleExportRoute() {
    if (!result) return
    
    const data = {
      date: deliveryDate,
      totalDistance: (result.totalDistance / 1000).toFixed(2) + ' km',
      totalDuration: (result.totalDuration / 3600).toFixed(2) + ' hours',
      fuelCost: formattedFuelCost,
      stops: result.order.map((idx, i) => {
        const stopData: any = {
          order: i + 1,
          location: pins[idx]?.label || `Stop ${idx}`,
          coordinates: `${pins[idx]?.lat.toFixed(5)}, ${pins[idx]?.lng.toFixed(5)}`,
          completed: completedStops.has(idx),
          scheduledTime: scheduledTimes[idx]?.arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
          notes: deliveryNotes[idx] || ''
        }

        if (completedStops.has(idx)) {
          stopData.completedTime = completedStops.get(idx)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
        }

        return stopData
      })
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `route-${deliveryDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleRemovePin(index: number) {
    if (index === 0) return
    setPins(prev => prev.filter((_, i) => i !== index))
    setResult(null)
    setPolyline(undefined)
    setCompletedStops(prev => {
      const next = new Map(prev)
      next.delete(index)
      return next
    })
  }

  function handleClearPins() {
    setPins([])
    setResult(null)
    setPolyline(undefined)
    setCompletedStops(new Map())
  }

  function handleAddRandomPoints(count: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    const generated: Pin[] = []
    const centerLat = (bounds.minLat + bounds.maxLat) / 2
    const centerLng = (bounds.minLng + bounds.maxLng) / 2
    const radiusLat = (bounds.maxLat - bounds.minLat) / 2
    const radiusLng = (bounds.maxLng - bounds.minLng) / 2
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI
      const r = Math.sqrt(Math.random())
      const lat = centerLat + r * radiusLat * Math.cos(angle)
      const lng = centerLng + r * radiusLng * Math.sin(angle)
      
      const currentIndex = pins.length + i
      generated.push({
        id: `${Date.now()}-${currentIndex}-${Math.random()}`,
        lat,
        lng,
        label: currentIndex === 0 ? 'Start' : `Stop ${currentIndex}`
      })
    }
    setPins(prev => [...prev, ...generated])
    setResult(null)
    setPolyline(undefined)
  }

  function handleAddLocationBySearch(lat: number, lng: number, displayName: string) {
    const currentIndex = pins.length
    setPins((prev: Pin[]) => [
      ...prev,
      {
        id: `${Date.now()}-${currentIndex}`,
        lat,
        lng,
        label: displayName || (currentIndex === 0 ? 'Start' : `Stop ${currentIndex}`)
      },
    ])
    setResult(null)
    setPolyline(undefined)
  }

  return (
    <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map Section - Takes 2 columns */}
      <div className="lg:col-span-2 space-y-4">
        <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
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
            selectedAlgo="best"
            completedStops={new Set(completedStops.keys())}
          />
        </div>

        {/* Route Summary Cards */}
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <MapPinIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Distance</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(result.totalDistance / 1000).toFixed(1)} <span className="text-sm font-normal">km</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <ClockIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(result.totalDuration / 3600).toFixed(1)} <span className="text-sm font-normal">hrs</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Fuel Cost</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formattedFuelCost}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <TruckIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Stops</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {pins.length - completedStops.size} <span className="text-sm font-normal">/ {pins.length}</span>
              </p>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        {result && completedStops.size > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-primary-200">
            <div className="flex items-center gap-2 text-gray-700 mb-3">
              <ChartBarIcon className="w-5 h-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Performance</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Schedule vs. Actual</p>
                <p className={`text-lg font-bold ${performanceStats.timeDifference > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {Math.abs(Math.round(performanceStats.timeDifference / 60))} min
                </p>
                <p className={`text-xs font-medium ${performanceStats.timeDifference > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {performanceStats.timeDifference > 0 ? 'Ahead' : 'Behind'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Scheduled Finish</p>
                <p className="text-lg font-bold text-gray-800">
                  {performanceStats.scheduledFinish?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{performanceStats.allCompleted ? 'Actual Finish' : 'Estimated Finish'}</p>
                <p className="text-lg font-bold text-primary-600">
                  {(performanceStats.allCompleted ? performanceStats.actualFinish : performanceStats.estimatedFinish)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Control Panel - Right sidebar */}
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Delivery Date & Start Time Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Stops Editor */}
        <StopsEditor
          pins={pins}
          onRename={(index, name) =>
            setPins((prev) => prev.map((p, i) => (i === index ? { ...p, label: name } : p)))
          }
          onRemove={handleRemovePin}
          onClear={handleClearPins}
          onAddRandomPoints={handleAddRandomPoints}
          onAddLocationBySearch={handleAddLocationBySearch}
        />

        {/* Optimize Button */}
        <button
          onClick={handleOptimizeRoute}
          disabled={!canCompute || isComputing}
          className={`w-full py-3 px-6 rounded-md font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            !canCompute || isComputing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {isComputing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5" />
              <span>Optimize Route</span>
            </>
          )}
        </button>

        {/* Route Details */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Delivery Schedule</h3>
              <button
                onClick={handleExportRoute}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export
              </button>
            </div>

            <div ref={scheduleContainerRef} className="space-y-2 max-h-96 overflow-y-auto">
              {result.order.map((pinIdx, orderIdx) => {
                const pin = pins[pinIdx]
                const isCompleted = completedStops.has(pinIdx)
                const leg = orderIdx > 0 ? result.legs[orderIdx - 1] : undefined
                
                return (
                  <div
                    key={`${pinIdx}-${orderIdx}`}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? 'bg-success-50 border-success-500 opacity-60'
                        : orderIdx === 0
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        orderIdx === 0 ? 'bg-primary-600 text-white' : 'bg-gray-400 text-white'
                      }`}>
                        {orderIdx === 0 ? 'S' : orderIdx}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {pin?.label || `Stop ${pinIdx}`}
                          </p>
                          <button
                            onClick={() => handleMarkCompleted(pinIdx)}
                            className={`flex-shrink-0 ${
                              isCompleted ? 'text-success-600' : 'text-gray-400 hover:text-success-600'
                            }`}
                          >
                            <CheckCircleIcon className="w-6 h-6" />
                          </button>
                        </div>

                        {leg && (
                          <p className="text-xs text-gray-600 mb-2">
                            {(leg.distance / 1000).toFixed(1)} km · {Math.round(leg.duration / 60)} min
                          </p>
                        )}

                        <div className="text-xs text-gray-800 space-y-1 mb-2">
                          {isCompleted ? (
                            <p>Completed: <span className="font-semibold">{completedStops.get(pinIdx)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                          ) : (
                            <>
                              <p>Scheduled: <span className="font-semibold">{scheduledTimes[pinIdx]?.arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                              <p>Estimated: <span className="font-semibold">{estimatedTimes[pinIdx]?.arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                            </>
                          )}
                        </div>
                        
                        <input
                          type="text"
                          value={deliveryNotes[pinIdx] || ''}
                          onChange={(e) => setDeliveryNotes(prev => ({
                            ...prev,
                            [pinIdx]: e.target.value
                          }))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Remaining Stats */}
        {result && remainingStops.length > 0 && (
          <div className="bg-primary-50 rounded-lg p-4 border-2 border-primary-200">
            <h4 className="font-semibold text-primary-900 mb-2">Remaining Today</h4>
            <div className="space-y-1 text-sm">
              <p className="text-primary-800">
                <span className="font-medium">{remainingStops.length}</span> stops remaining
              </p>
              <p className="text-primary-800">
                Est. <span className="font-medium">
                  {Math.round((result.totalDuration * (remainingStops.length / pins.length)) / 60)}
                </span> minutes
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
