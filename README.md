# 🗺️ TSPFront — Road‑aware TSP route planner (React + Leaflet + OSRM)

A frontend app that lets you drop multiple stops on a map (first = Source), pick one or more TSP algorithms, and compute an ordered route with realistic ETAs and distances over real roads.

- Tiles: OpenStreetMap
- Routing: OSRM (Table for matrix, Route for polyline)
- No backend required to run; a backend contract is provided for later.

---

## 📚 Table of contents
- ✨ Features
- 🚀 Quick start
- 🧭 How it works (data flow)
- 🧠 Algorithms
- 🛣️ OSRM usage
- ⚙️ Configuration
- 🔌 Backend API contract (future)
- 🖥️ UI/UX behaviors
- 📦 Project structure
- ⏱️ Performance notes
- 🛟 Troubleshooting
- 🗺️ Roadmap
- 🤔 Why this stack?
- 🔒 Security & privacy

---

## ✨ Features
- Click-to-add pins; dropdown appears after you add 4+ pins (first pin = Source).
- Choose algorithms: Brute Force, Nearest Neighbor, 2‑Opt, Genetic.
- Compute totals and per-stop ETAs based on road travel durations.
- Draw the best route polyline following real roads (OSRM Route API).
- Fallback to straight-line estimates if OSRM is unreachable.
- Rename stops (Source, Stop 1, Stop 2, …) to show names in results.

---

## 🚀 Quick start

Prereqs: Node.js 18+ (tested on Node 20) and npm

```bash
npm install
npm run dev
```
Open the URL printed by Vite (e.g., http://localhost:5173).

Production build preview:
```bash
npm run build
npm run preview
```
If Node is installed locally in your home, ensure PATH includes it:
```bash
export PATH="$HOME/.local/node-v20.15.1-linux-x64/bin:$PATH"
```

---

## 🧭 How it works (data flow)
1) You place ≥ 4 pins (first pin becomes the Source).
2) The app builds coordinates as [lng, lat].
3) It calls OSRM Table API to get a full duration/distance matrix between all pins.
4) Selected algorithms run in the browser on that matrix to compute an order and per‑leg aggregation.
5) The best (fastest) solution is chosen; OSRM Route API fetches a roads‑following polyline for the best order.
6) UI displays totals and per‑stop ETA/distance; the map shows the polyline.

Key files:
- `src/App.tsx` — Orchestrates pins → matrix → algorithms → best polyline.
- `src/lib/osrm.ts` — Calls OSRM Table/Route with a Haversine fallback.
- `src/lib/tsp.ts` — TSP algorithms and aggregation helpers.
- `src/components/ResultsPanel.tsx` — Totals + per‑stop ETAs (uses stop names).
- `src/components/MapView.tsx` — Map, markers, and polyline.
- `src/components/StopsEditor.tsx` — Rename stops shown in results.

---

## 🧠 Algorithms
All start from the Source at index 0, optimizing total travel time using the OSRM durations matrix.

- Brute Force (exact, small N)
  - Enumerates all permutations of non‑source stops; picks minimal total duration.
  - Complexity ~ O((n−1)!). Auto‑skipped for larger N.

- Nearest Neighbor (greedy baseline)
  - From current stop, pick the closest unvisited by duration.
  - Very fast, may be sub‑optimal.

- 2‑Opt (local improvement)
  - Starts from NN and iteratively applies edge swaps that reduce total duration.
  - Good balance for small/medium N.

- Genetic Algorithm (stochastic search)
  - Small population; crossover + mutation; keep elites.
  - Tuned for responsiveness, not absolute optimality.

Aggregation (common):
- `totalForOrder(order, matrix)` sums leg distance/time; returns legs, totalDistance, totalDuration.
- Results show leg details and cumulative ETA at each stop.

---

## 🛣️ OSRM usage
Default base: `https://router.project-osrm.org` (public demo; no SLA)

- Table (matrix):
  - `GET /table/v1/driving/{lng,lat;...}?annotations=duration,distance`
  - Returns `durations: number[][]` (seconds), `distances: number[][]` (meters)

- Route (polyline):
  - `GET /route/v1/driving/{ordered-lng,lat;...}?overview=full&geometries=geojson`
  - Returns GeoJSON LineString. We convert [lng, lat] → Leaflet [lat, lng].

- Fallbacks:
  - If Table fails: Haversine distances + rough driving speed to synthesize a matrix.
  - If Route fails: draw straight segments.

---

## ⚙️ Configuration
- `VITE_OSRM_BASE` — Override OSRM base URL

Create `.env` (see `.env.example`):
```bash
VITE_OSRM_BASE=https://your-osrm.example.com
```

---

## 🔌 Backend API contract (future)
Proposed endpoint: `POST /api/tsp/solve`

Request:
```json
{
  "coordinates": [[lng, lat], [lng, lat], ...],
  "sourceIndex": 0,
  "algorithms": ["brute_force", "nearest_neighbor", "two_opt", "genetic"],
  "profile": "driving"
}
```
Response:
```json
{
  "matrix": { "durations": [[0, ...], ...], "distances": [[0, ...], ...] },
  "solutions": {
    "nearest_neighbor": {
      "order": [0, 3, 1, 2],
      "totalDistance": 12345,
      "totalDuration": 2345,
      "legs": [{ "from": 0, "to": 3, "distance": 4567, "duration": 890 }]
    },
    "two_opt": { },
    "brute_force": null,
    "genetic": { }
  },
  "polylines": {
    "best": { "type": "LineString", "coordinates": [[lng, lat], ...] }
  }
}
```
Errors:
- 400 invalid coordinates; 422 need ≥ 4 points; 502 upstream router failure.

Types (frontend): `src/types/api.ts`.

---

## 🖥️ UI/UX behaviors
- Add pins: click map. First pin becomes “Source”. Others default to “Stop N”.
- Rename stops in the sidebar (Stops section). These names appear in the results.
- Algorithms enabled once you have ≥ 4 pins.
- Results show totals and an ordered list: Start, Stop 1, Stop 2, … with names, leg distance/time, and ETA at each stop.
- Map draws the best (fastest) route polyline over roads.

---

## 📦 Project structure
```
.
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .env.example
├─ src/
│  ├─ App.tsx                # Orchestration (pins → matrix → algorithms → route)
│  ├─ main.tsx               # React entry
│  ├─ styles/
│  │  └─ main.css            # Basic layout
│  ├─ components/
│  │  ├─ MapView.tsx         # Leaflet map, markers, polyline
│  │  ├─ AlgorithmPicker.tsx # Select algorithms & Compute button
│  │  ├─ ResultsPanel.tsx    # Totals + per-stop ETAs (stop names)
│  │  └─ StopsEditor.tsx     # Rename stops (Source, Stop N)
│  └─ lib/
│     ├─ osrm.ts             # OSRM helpers (Table/Route) + fallbacks
│     └─ tsp.ts              # TSP algorithms + aggregation
└─ README.md
```

---

## ⏱️ Performance notes
- OSRM Table: one request; O(n²) matrix entries.
- Brute force: factorial growth; auto‑skipped for larger N.
- NN/2‑Opt/Genetic: responsive for small/medium N in the browser.
- Public OSRM is rate‑limited; spike traffic may fail intermittently → fallbacks kick in.

---

## 🛟 Troubleshooting
- Blank map tiles → check internet; proxies/firewalls can block OSM tiles.
- No polyline → OSRM Route might be down; we fall back to straight lines. Try later or set `VITE_OSRM_BASE`.
- Compute disabled → add at least 4 pins (first is the Source).
- npm not found → install Node 18+ and ensure PATH includes it.
- CORS (rare) → OSRM demo allows GET; for custom OSRM, enable CORS.
- Test on LAN → `npm run dev -- --host` and open the Network URL.

---

## 🗺️ Roadmap
- Pin management (drag, delete, reorder; choose a different Source).
- Visual compare across algorithms (toggle polylines).
- Persist/share routes; export GPX/GeoJSON.
- Backend service (Node/Nest) + OR‑Tools for exact/advanced VRP.
- Dedicated OSRM instance; rate limiting and analytics.
- Unit tests for algorithms; lightweight e2e smoke tests.

---

## 🤔 Why this stack?
- Leaflet + OSM: lightweight, fast for markers/lines, open data.
- OSRM: free, open‑source, practical routing with matrix + route APIs.
- Vite + React + TypeScript: fast DX, strong typing, and simple build.

---

## 🔒 Security & privacy
- No API keys needed for the demo OSRM or OSM tiles.
- Frontend only; no user accounts or secrets.
- For production: host your router (privacy/reliability), add quotas, and protect endpoints.

---

If you need pin deletion/reordering, a hosted OSRM, or a backend service scaffold, open an issue or request and we’ll extend this.