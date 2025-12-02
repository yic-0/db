import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom venue marker (red pin)
const venueIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background-color: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        color: white;
        font-size: 14px;
      "></span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Component to set map view
function SetMapView({ lat, lng, zoom }) {
  const map = useMap()

  useEffect(() => {
    map.setView([lat, lng], zoom)
  }, [map, lat, lng, zoom])

  return null
}

export default function VenueMap({
  lat,
  lng,
  name,
  address,
  locationLink,
  height = '200px',
  className = ''
}) {
  if (!lat || !lng) return null

  const openInMaps = () => {
    // Prefer the location link if provided, otherwise open in Google Maps
    if (locationLink) {
      window.open(locationLink, '_blank')
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
    }
  }

  return (
    <div
      className={`rounded-lg overflow-hidden border border-slate-200 shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetMapView lat={lat} lng={lng} zoom={14} />
        <Marker position={[lat, lng]} icon={venueIcon}>
          <Popup>
            <div className="min-w-[180px]">
              <div className="font-bold text-slate-900">{name || 'Event Location'}</div>
              {address && (
                <div className="text-sm text-slate-600 mt-1">{address}</div>
              )}
              <button
                onClick={openInMaps}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                Open in Maps
              </button>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
