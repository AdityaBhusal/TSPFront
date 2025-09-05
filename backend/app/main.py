from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import SolveRequest, SolveResponse, Solution
from .osrm import osrm_table, osrm_route
from . import tsp

app = FastAPI(title="TSPFront Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/tsp/solve", response_model=SolveResponse)
async def solve(req: SolveRequest):
    if len(req.coordinates) < 3:
        raise HTTPException(status_code=422, detail="Need at least 3 points")

    matrix = await osrm_table(req.coordinates, req.profile)

    algos = req.algorithms or ["nearest_neighbor"]
    solns: dict[str, Solution | None] = {
        "brute_force": None,
        "nearest_neighbor": None,
        "two_opt": None,
        "genetic": None,
    }

    for a in algos:
        if a == "brute_force":
            solns[a] = tsp.brute_force(matrix)
        elif a == "nearest_neighbor":
            solns[a] = tsp.nearest_neighbor(matrix)
        elif a == "two_opt":
            solns[a] = tsp.two_opt(matrix)
        elif a == "genetic":
            solns[a] = tsp.genetic(matrix)

    # pick best
    best = None
    for v in solns.values():
        if v is None: continue
        if best is None or v.totalDuration < best.totalDuration:
            best = v

    polylines = None
    if best:
        order = best.order
        ordered_coords = [req.coordinates[i] for i in order]
        line = await osrm_route(ordered_coords, req.profile)
        # return as GeoJSON-like lon/lat pairs for frontend consistency
        poly_coords = [[lng, lat] for (lat, lng) in line]
        polylines = {"best": {"type": "LineString", "coordinates": poly_coords}}

    return SolveResponse(matrix=matrix, solutions=solns, polylines=polylines)
