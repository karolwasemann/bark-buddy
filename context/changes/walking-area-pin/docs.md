# Leaflet + OSM Docs for S-02 (walking-area-pin)

External library documentation fetched via Context7 for implementing the map component.

## Map Initialization + OSM Tiles

```javascript
import { LeafletMap, TileLayer } from 'leaflet';

const map = new LeafletMap('map').setView([51.505, -0.09], 13);

new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
```

- **`LeafletMap(containerId)`** — binds to a DOM element by ID
- **`.setView([lat, lng], zoom)`** — sets initial center & zoom
- **TileLayer** — OSM tiles are free, no API key, just attribution required

## Marker (draggable pin)

```javascript
import { Marker } from 'leaflet';

const marker = new Marker([50.5, 30.51], { draggable: true }).addTo(map);

// Listen to drag end to get final position
marker.on('dragend', () => {
  const latlng = marker.getLatLng(); // { lat, lng }
  console.log(latlng.lat, latlng.lng);
});
```

- **`draggable: true`** — user can move the pin
- **`marker.getLatLng()`** — returns `{ lat, lng }` after drag
- **`marker.setLatLng([lat, lng])`** — move programmatically

## Circle (radius overlay)

```javascript
import { Circle } from 'leaflet';

const circle = new Circle([51.508, -0.11], {
  color: 'red',
  fillColor: '#f03',
  fillOpacity: 0.5,
  radius: 500 // radius in METERS
}).addTo(map);

// Update position/radius dynamically
circle.setLatLng([newLat, newLng]);
circle.setRadius(750); // meters
```

- **`radius`** — in **meters** (not pixels) for `Circle` (vs `CircleMarker` which uses pixels)
- **`setRadius(n)`** — update radius dynamically (e.g., from a slider)
- **`setLatLng(latlng)`** — move circle to follow marker

## Map Click Events

```javascript
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  marker.setLatLng([lat, lng]);
  circle.setLatLng([lat, lng]);
});
```

- **`e.latlng`** — coordinates of the click
- Use to place/move pin on first click or re-place

## Marker Icon Fix (Next.js bundling)

Default Leaflet marker icons break under bundlers. Fix:

```javascript
import L from 'leaflet';

L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});
```

Copy icon files from `node_modules/leaflet/dist/images/` → `public/leaflet/`.

## Next.js 16 Integration Pattern

Since Leaflet touches `window`, use a **Client Component** with `next/dynamic`:

```tsx
// src/components/MapView.tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function MapView({ onPinChange }: { onPinChange: (lat: number, lng: number) => void }) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const map = L.map('map').setView([52.23, 21.01], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([52.23, 21.01], { draggable: true }).addTo(map);
    const circle = L.circle([52.23, 21.01], { radius: 500 }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      circle.setLatLng([lat, lng]);
      onPinChange(lat, lng);
    });

    mapRef.current = map;
    return () => { map.remove(); };
  }, []);

  return <div id="map" className="h-96 w-full rounded-lg" />;
}
```

```tsx
// Dynamic import in page (ssr: false is critical)
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView').then(m => m.MapView), {
  ssr: false,
});
```

## Data Shape (F-02 compatibility)

```typescript
interface WalkingAreaPin {
  lat: number;
  lng: number;
  radius_m: number; // meters, matches L.Circle radius unit
}
```

## Key Decisions for Plan

| Decision | Choice | Rationale |
|---|---|---|
| Library | Leaflet vanilla (no `react-leaflet`) | Avoids React 19 hydration bugs |
| Tiles | OSM `tile.openstreetmap.org` | Free, no key |
| SSR | `next/dynamic` with `ssr: false` | Leaflet needs `window` |
| Pin | `L.Marker` with `draggable: true` | User moves pin freely |
| Radius | `L.Circle` with `radius` in meters | Matches DB schema |
| Icons | Copy to `/public/leaflet/` + `Icon.Default.mergeOptions` | Fixes bundler path issue |
| Radius input | HTML range slider (outside map) | Controls `circle.setRadius()` |
