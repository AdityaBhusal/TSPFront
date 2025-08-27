# TSPFront — Road-aware TSP route planner (React + Leaflet + OSRM)

This project is a frontend prototype that lets you drop multiple pins on a map (first pin is the source), choose one or more TSP algorithms, and compute an ordered route with realistic ETAs and distances over actual roads. It uses OpenStreetMap (tiles) and OSRM (routing) to compute a road-constrained matrix and route polyline. No backend is required to run the prototype, but a clear backend contract is included for future work.

- Demo features:
  - Click-to-add pins; dropdown appears after you add 4+ pins.
  - Choose algorithms: Brute Force, Nearest Neighbor, 2-Opt, Genetic.
  - Compute totals and per-stop ETAs based on road travel durations.
  - Draw the best route polyline following real roads.
  - Fallback to straight-line estimates if OSRM is unreachable.

## 1) Quick start

Prereqs:
- Node.js 18+ (tested with Node 20) and npm.

Install and run:

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically http://localhost:5173).

Production build:

```bash
npm run build
npm run preview
```

If you installed Node locally to your home (no system Node), ensure PATH includes your Node bin, e.g.:

```bash
export PATH="$HOME/.local/node-v20.15.1-linux-x64/bin:$PATH"
```

## 2) What happens when you click “Compute”

High-level data flow:
1. You place ≥4 pins (first pin is the source).
2. Frontend builds a list of coordinates in [lng, lat] order.
3. Frontend calls OSRM Table API to get a full duration/distance matrix between all pins (driving profile).
4. Selected algorithms run in the browser on that matrix to compute an order and per-leg aggregation.
5. The best (fastest) solution is chosen, and OSRM Route API is called for a roads-following polyline.
6. UI displays totals and per-stop ETA/distance; the map shows the polyline.

Relevant files:
- `src/App.tsx` — Orchestrates pin state, invokes `osrmMatrix` and `computeTSP`, selects the best solution, and fetches the polyline via `osrmRoute`.
- `src/lib/osrm.ts` — Encapsulates OSRM Table (matrix) and Route (polyline) calls; includes a fallback Haversine matrix if OSRM is down.
- `src/lib/tsp.ts` — Implements the TSP algorithms and aggregations.
- `src/components/ResultsPanel.tsx` — Computes per-stop cumulative ETAs (sum of leg durations) and renders the results.
- `src/components/MapView.tsx` — Renders pins and the best route polyline.

## 3) Algorithms (how we compute the order)

All algorithms assume the first stop (index 0) is the source. They optimize travel time using the OSRM durations matrix.

- Brute Force (exact, small N only)
  - Enumerates all permutations of the non-source stops; picks the minimal total duration.
  - Complexity ~ O((n-1)!). Auto-skips for larger point sets to avoid freezing the UI.

- Nearest Neighbor (greedy baseline)
  - From current stop, pick the unvisited stop with the smallest duration.
  - Fast but can be suboptimal.

- 2-Opt (local improvement)
  - Starts from the NN tour, and iteratively attempts pairwise edge swaps that reduce total duration.
  - Good balance of speed and quality for small/medium N.

- Genetic Algorithm (stochastic search)
  - Maintains a small population, evolves via crossover/mutation, and keeps elites.
  - Parameters are intentionally conservative for responsiveness.

Aggregation for any order:
- `totalForOrder(order, matrix)` sums per-leg distance/time and returns legs, totalDistance, totalDuration.
- Results render per-leg details and cumulative ETAs in the UI.

## 4) OSRM usage (routes that follow roads)

We use the public OSRM demo (non-SLA) by default. You can host your own OSRM instance or switch to another routing provider.

- Table API (matrix):
  - Endpoint: `/table/v1/driving/{lng,lat;...}?annotations=duration,distance`
  - Returns `durations: number[][]` in seconds and `distances: number[][]` in meters.

- Route API (polyline):
  - Endpoint: `/route/v1/driving/{ordered-lng,lat;...}?overview=full&geometries=geojson`
  - Returns a GeoJSON LineString. We convert [lng, lat] to Leaflet’s [lat, lng] for drawing.

- Fallback behavior:
  - If Table fails, we synthesize a matrix using Haversine distance with an approximate driving speed.
  - If Route fails, we draw straight segments between ordered points.

- Base URL configuration:
  - Default: `https://router.project-osrm.org`
  - Override with env var: `VITE_OSRM_BASE` (see `.env.example`).

## 5) Backend API contract (for future server implementation)

Proposed endpoint: `POST /api/tsp/solve`

Request body:
```json
{
  "coordinates": [[lng, lat], [lng, lat], ...],
  "sourceIndex": 0,
  "algorithms": ["brute_force", "nearest_neighbor", "two_opt", "genetic"],
  "profile": "driving"
}
```

Response body:
```json
{
  "matrix": { "durations": [[0, ...], ...], "distances": [[0, ...], ...] },
  "solutions": {
    "nearest_neighbor": {
      "order": [0, 3, 1, 2],
      "totalDistance": 12345,
      "totalDuration": 2345,
      "legs": [{ "from": 0, "to": 3, "distance": 4567, "duration": 890 }, ...]
    },
    "two_opt": { ... },
    "brute_force": null,
    "genetic": { ... }
  },
  "polylines": {
    "best": { "type": "LineString", "coordinates": [[lng, lat], ...] }
  }
}
```

Error codes:
- 400: Invalid coordinates
- 422: Not enough points (need ≥ 4)
- 502: Upstream router failure

Types used on the frontend: `src/types/api.ts`.

## 6) UI/UX behavior and constraints

- Pin placement: click on the map to add pins. The first pin is labeled as the source.
- Dropdown gating: the algorithm selection UI is enabled once there are at least 4 pins.
- Results: shows total distance/time and a per-leg list with per-stop cumulative ETA.
- Map rendering: Leaflet map with OSM tiles, default markers, and a roads-following polyline for the best algorithm’s route.
- Limits: Brute force is disabled automatically for larger N; heuristics are used instead.

## 7) Project structure

```
.
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .env.example
├─ src/
│  ├─ App.tsx                # App state and orchestration (pins -> matrix -> TSP -> polyline)
│  ├─ main.tsx               # React entry
│  ├─ styles/
│  │  └─ main.css            # Basic layout styles
│  ├─ components/
│  │  ├─ MapView.tsx         # Leaflet map, click-to-add pins, draw polyline
│  │  ├─ AlgorithmPicker.tsx # Multi-select and Compute button
│  │  └─ ResultsPanel.tsx    # Totals and per-stop ETAs
│  └─ lib/
│     ├─ osrm.ts             # OSRM Table/Route helpers + fallbacks
│     └─ tsp.ts              # TSP algorithms and aggregations
└─ README.md
```

## 8) Configuration and environments

Environment variables (Vite):
- `VITE_OSRM_BASE` — Override OSRM base URL.

To use a custom OSRM instance, create `.env` and set:
```bash
VITE_OSRM_BASE=https://your-osrm.example.com
```

## 9) Performance notes

- Matrix computation complexity: O(n^2) entries from OSRM Table (one network call).
- Brute force: O((n-1)!). Capped to small N.
- Nearest Neighbor/2-Opt/Genetic: fast enough for typical small/medium N on the client.
- Public OSRM demo: rate-limited; bursts or large N may be slow or fail intermittently (fallback covers this with reduced realism).

## 10) Troubleshooting

- Blank map tiles:
  - Ensure internet access. The OSM tile server is public; corporate proxies can block it.
- No route polyline:
  - OSRM Route may be down. We fall back to straight lines. Try again later or set `VITE_OSRM_BASE`.
- Compute button disabled:
  - Add at least 4 pins. The first pin is the source.
- “npm not found” or wrong Node:
  - Install Node 18+ and ensure PATH includes your Node bin. Re-open your terminal after changing PATH.
- CORS issues (rare):
  - OSRM demo should allow cross-origin for GET. For a custom OSRM, enable CORS.
- Expose dev server on LAN:
  - Start with `npm run dev -- --host` and visit the shown Network URL.

## 11) Roadmap (nice-to-haves)

- Pin management (drag, delete, reorder; pick a different source).
- Visual comparison across algorithms (overlay multiple polylines, toggle visibility).
- Persist/share routes, export GPX/GeoJSON.
- Full backend service (Node/Nest), OR-Tools for exact/advanced VRP, and a dedicated OSRM instance.
- Unit tests for TSP functions and a minimal e2e smoke test.

## 12) Why these choices?

- Leaflet + OSM: lightweight, fast for markers/lines, no vendor lock-in.
- OSRM: free, open-source, road-constrained routing with table + route APIs.
- Vite + React + TypeScript: fast DX, strong typing, simple build pipeline.

## 13) Security and privacy

- No API keys are required for the demo OSRM or OSM tiles.
- This frontend makes client-side GET requests to the OSRM public demo (no user accounts or secrets involved).
- For production, host your own router (control usage, reliability, and privacy) and enforce rate limits.

---

If you need pin deletion/reordering, a hosted OSRM, or a backend service scaffold, open an issue or request and we’ll extend this.