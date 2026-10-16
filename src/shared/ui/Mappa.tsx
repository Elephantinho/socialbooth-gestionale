import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'

export type Segnaposto = {
  id: string
  lat: number
  lng: number
  colore: string        // colore del cerchio
  raggio?: number
  etichetta?: string
  sempre?: boolean      // etichetta sempre visibile
  onClick?: () => void
}

/** Adatta lo zoom per far vedere tutti i segnaposto */
function Inquadra({ punti, zoomMax }: { punti: Segnaposto[]; zoomMax: number }) {
  const mappa = useMap()
  useEffect(() => {
    if (!punti.length) return
    if (punti.length === 1) mappa.setView([punti[0].lat, punti[0].lng], zoomMax)
    else mappa.fitBounds(latLngBounds(punti.map((p) => [p.lat, p.lng])), { padding: [28, 28], maxZoom: zoomMax })
  }, [mappa, punti, zoomMax])
  return null
}

/** Mappa OpenStreetMap con cerchi colorati (niente immagini da caricare, leggera sul telefono) */
export function Mappa({ punti, altezza = 240, zoomMax = 16, className }: {
  punti: Segnaposto[]
  altezza?: number
  zoomMax?: number
  className?: string
}) {
  const centro: [number, number] = punti[0] ? [punti[0].lat, punti[0].lng] : [42.5, 12.5]
  return (
    <div className={className} style={{ height: altezza }}>
      <MapContainer center={centro} zoom={punti.length ? 15 : 5} scrollWheelZoom={false} className="h-full w-full rounded-[inherit] z-0"
        attributionControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {punti.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={p.raggio ?? 8}
            pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: p.colore, fillOpacity: 0.95 }}
            eventHandlers={p.onClick ? { click: p.onClick } : undefined}>
            {p.etichetta && <Tooltip permanent={p.sempre} direction="top" offset={[0, -6]}>{p.etichetta}</Tooltip>}
          </CircleMarker>
        ))}
        <Inquadra punti={punti} zoomMax={zoomMax} />
      </MapContainer>
    </div>
  )
}
