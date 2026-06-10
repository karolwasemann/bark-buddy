# S-02 Map Library Research

External research for the walking-area-pin change — which map engine and tile provider to use.

## Requirements

S-02 needs: **place a pin on a map** + **set a radius (circle)** to mark a walking area.

## Engine Options

| Engine | Bundle | Cost / License | Pin + Circle support | Next.js 16 + React 19 fit |
|---|---|---|---|---|
| **Leaflet** (vanilla or `react-leaflet`) | ~40 KB | Free, BSD | Built-in `Marker` + `Circle` (radius in meters) | Needs `dynamic({ ssr: false })`; `react-leaflet` has hydration issues with React 19 |
| **MapLibre GL JS** (`react-map-gl` / `react-maplibre`) | ~290 KB | Free, BSD-3 | Marker built-in; circle via GeoJSON layer or `turf.circle()` | Works with App Router; heavier but cleaner SSR story |
| **Mapbox GL JS** (`react-map-gl`) | ~300 KB | Freemium — 50K loads/month free, then $5/1K | Same as MapLibre | Needs API key + billing setup |
| **Google Maps** (`@vis.gl/react-google-maps`) | Variable | Pay-per-load after $200 credit | `google.maps.Circle` built-in | Proprietary + key + billing |

## Tile Provider Options (free / cheap)

- **OpenStreetMap (OSM)** — free, no key, attribution required, fair-use only.
- **MapTiler** — free tier ~100K tile loads/month, vector + raster, requires key.
- **Stadia Maps** — free for non-commercial, generous limits.
- **OpenFreeMap** — community-funded, no key, vector tiles.

## Recommendation

**Leaflet (vanilla wrapper) + OSM tiles.**

Reasons:
- Smallest bundle (~40 KB) — keeps map page fast alongside S-03 match list.
- `L.circle(latlng, { radius })` is a one-liner — exactly S-02's job.
- Free, no API key, no billing, no quota anxiety during validation.
- Storage-agnostic — stores `{lat, lng, radius_m}` as plain numbers (or PostGIS geography).

## Key Integration Notes

- **SSR pitfall:** Leaflet touches `window`. Map component must be a Client Component imported via `next/dynamic` with `ssr: false`.
- **`react-leaflet` caveat:** A Nov 2025 dev.to post flags hydration mismatches and broken context with Next.js 16 + React 19. Recommends a thin vanilla-Leaflet wrapper instead.
- **Reference starter:** [`wellywahyudi/nextjs-leaflet-starter`](https://github.com/wellywahyudi/nextjs-leaflet-starter) — Next.js 16.0.7, React 19.2, Leaflet 1.9, Tailwind 4, shadcn/ui. Same stack as BarkBuddy.
- **Marker icons:** Default Leaflet icons break under Next.js bundling. Must copy icons to `public/` or override `L.Icon.Default`.
- **Privacy NFR:** Pin and radius must never leak to other users — Supabase RLS concern, not library concern.
- **Storage shape:** For S-03 geo-overlap (F-02), pin stored as PostGIS `geography(Point)`, radius as `numeric`. Swapping map engines later is cheap since the library only deals in `{lat, lng}` pairs.

## Sources

- PkgPulse "Mapbox vs Leaflet vs MapLibre: Maps 2026" (2026-03-09)
- dev.to "I built a Google Maps Clone using Next.js 16 + Leaflet" (2025-11-30)
- MapLibre GL JS GitHub (v5.23.0, BSD-3, 10K+ stars)
- Mapbox pricing page (50K free loads, $5/1K after)
- Digital Thrive "React Map Library Comparison" (2025)
- youngju.dev "Map & Geospatial Tools 2026" (2026-05-16)
