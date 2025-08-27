# TSP Map Prototype (Frontend)

A minimal React + Vite + Leaflet prototype to drop 4+ pins, pick algorithms, and compute road-aware TSP estimates using OSRM (durations/distances). Shows totals and per-leg ETAs. Backend contract included for future.

## Stack
- React 18 + TypeScript + Vite
- Leaflet + react-leaflet with OpenStreetMap tiles
- OSRM demo server for road-constrained duration/distance matrix and polyline

## Run
- Install deps and start dev server:

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## How it works
- Click on the map to drop pins (first pin is the source). After 4+ pins, select algorithms and Compute.
- The app calls OSRM Table API to get a duration/distance matrix between all pins (driving profile).
- TSP algorithms run on the matrix to produce an order, total distance/time, and per-leg breakdown.
- For the best route, OSRM Route API can produce a roads-following polyline (hooked up for future drawing).

## Backend contract (proposed)
- Endpoint: `POST /api/tsp/solve`
- Request body:
```json
{
  "coordinates": [[lng, lat], ...],
  "sourceIndex": 0,
  "algorithms": ["brute_force", "nearest_neighbor", "two_opt", "genetic"],
  "profile": "driving" // optional: driving | walking | cycling
}
```
- Response body:
```json
{
  "matrix": { "durations": number[][], "distances": number[][] },
  "solutions": {
    "nearest_neighbor": {"order": number[], "totalDistance": number, "totalDuration": number, "legs": [{"from": n, "to": n, "distance": n, "duration": n}]},
    "two_opt": {"order": number[], "totalDistance": number, "totalDuration": number, "legs": [...]},
    "brute_force": null | { ... },
    "genetic": null | { ... }
  },
  "polylines": {
    "best": { "type": "LineString", "coordinates": [[lng, lat], ...] }
  }
}
```
- Error cases: 400 invalid coordinates, 422 not enough points (< 4), 502 upstream OSRM failure.

## Folder structure
- src/
  - components/ MapView, AlgorithmPicker, ResultsPanel
  - lib/ osrm helpers, tsp algorithms
  - App.tsx, main.tsx
  - styles/

## Notes
- OSRM public server is rate-limited and non-SLA; for production, run OSRM or use Mapbox Directions Matrix, GraphHopper, Valhalla, or Google Routes API.
- Brute force is auto-capped to small N to avoid stalls.
- Two-Opt/Genetic are heuristic; times are based on OSRM durations between points.