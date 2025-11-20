import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LeafletMouseEvent } from 'leaflet'
import { useMemo } from 'react'
import type { Pin } from '../App'
import { MapPinIcon } from '@heroicons/react/24/outline'

// Fix default icon paths in many bundlers
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom marker icons
const createNumberedIcon = (number: number, isStart: boolean = false, isCompleted: boolean = false) => {
  const color = isCompleted ? '#9ca3af' : isStart ? '#10b981' : '#4f46e5'
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: white;
        opacity: ${isCompleted ? '0.5' : '1'};
        ${isCompleted ? 'text-decoration: line-through;' : ''}
      ">
        ${isStart ? 'S' : number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
  return icon
}

type Props = {
  pins: Pin[]
  onAddPin: (lat: number, lng: number) => void
  polyline?: [number, number][]
  selectedAlgo?: string | null
  completedStops?: Set<number>
}

function ClickHandler({ onAddPin }: { onAddPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onAddPin(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function MapView({ pins, onAddPin, polyline, selectedAlgo, completedStops }: Props) {
  // Default to Kathmandu, Nepal
  const KATHMANDU = { lat: 27.7172453, lng: 85.3239605 }
  
  const polylineColor = useMemo(() => {
    // Green-leaning palette: primary/accent/warning
    if (!selectedAlgo) return '#059669' // primary-600
    if (selectedAlgo === 'best') return '#10b981' // primary-500 (lighter green)
    const colors: Record<string, string> = {
      brute_force: '#059669', // primary-600 (green)
      nearest_neighbor: '#10b981', // primary-500 (green)
      genetic: '#059669', // use primary green instead of purple/amber
    }
    return colors[selectedAlgo] || '#059669'
  }, [selectedAlgo])

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[KATHMANDU.lat, KATHMANDU.lng]} zoom={12} style={{ height: '100%', width: '100%' }} className="rounded-lg shadow-lg">
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution="&copy; OpenStreetMap contributors" 
        />
        <ClickHandler onAddPin={onAddPin} />
        
        {pins.map((p, i) => {
          const isCompleted = completedStops?.has(i) || false
          return (
            <Marker 
              key={p.id} 
              position={[p.lat, p.lng]} 
              icon={createNumberedIcon(i, i === 0, isCompleted)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 mb-1">
                    {p.label || (i === 0 ? 'Start' : `Stop ${i}`)}
                    {isCompleted && <span className="ml-2 text-xs text-success-600">✓ Completed</span>}
                  </p>
                  <p className="text-xs text-gray-600">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Draw the roads-following polyline when available */}
        {polyline && polyline.length > 1 && (
          <Polyline 
            positions={polyline} 
            pathOptions={{ 
              color: polylineColor, 
              weight: 5,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            }} 
          />
        )}
      </MapContainer>
      
      {/* Legend */}
      {selectedAlgo && polyline && polyline.length > 1 && (
        <div className="absolute top-4 right-4 bg-white rounded-md shadow p-2 border border-gray-100 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ backgroundColor: polylineColor }} />
            <MapPinIcon className="w-4 h-4 text-gray-600" aria-hidden />
            <span className="text-sm font-semibold text-gray-700">
              {selectedAlgo === 'best' ? 'Best Route' : selectedAlgo.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {/* Instructions overlay */}
      {pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          <div className="bg-white rounded-md shadow p-4 max-w-sm border border-gray-100">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add your first stop</h3>
              <p className="text-gray-600 text-sm">Click anywhere on the map to add your first stop</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
