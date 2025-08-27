import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LeafletMouseEvent } from 'leaflet'
import { useMemo } from 'react'
import type { Pin } from '../App'

// Fix default icon paths in many bundlers
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type Props = {
  pins: Pin[]
  onAddPin: (lat: number, lng: number) => void
  polyline?: [number, number][]
}

function ClickHandler({ onAddPin }: { onAddPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onAddPin(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function MapView({ pins, onAddPin, polyline }: Props) {
  const center = useMemo(() => ({ lat: pins[0]?.lat ?? 28.6139, lng: pins[0]?.lng ?? 77.209 }), [pins])

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ClickHandler onAddPin={onAddPin} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} />
      ))}
      {/* Draw the roads-following polyline when available */}
      {polyline && polyline.length > 1 && (
        <Polyline positions={polyline} pathOptions={{ color: 'steelblue', weight: 4 }} />
      )}
    </MapContainer>
  )
}
