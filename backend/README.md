# Python Backend (FastAPI) for TSPFront

This service computes TSP routes on the server, using OSRM for road-aware distances/durations, and returns ordered routes with totals and legs.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional: set OSRM base URL
```bash
export OSRM_BASE=https://router.project-osrm.org
```

## Endpoints
- POST /api/tsp/solve — compute matrix + algorithms; returns solutions and optional polyline for the best tour.

## Structure
```
backend/
├─ app/
│  ├─ main.py         # FastAPI app and routes
│  ├─ models.py       # Pydantic models
│  ├─ osrm.py         # OSRM Table/Route helpers
│  └─ tsp.py          # Algorithms (brute, NN, 2-opt, genetic)
└─ requirements.txt
```
