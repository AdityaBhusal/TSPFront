from typing import List, Literal, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

AlgoKey = Literal["brute_force", "nearest_neighbor", "two_opt", "genetic"]
Profile = Literal["driving", "foot", "bike"]

class SolveRequest(BaseModel):
    coordinates: List[Tuple[float, float]]  # [lng, lat]
    sourceIndex: int = 0
    algorithms: List[AlgoKey] = Field(default_factory=lambda: ["nearest_neighbor"])
    profile: Profile = "driving"

class Matrix(BaseModel):
    durations: List[List[float]]
    distances: List[List[float]]

class Leg(BaseModel):
    from_: int = Field(alias="from")
    to: int
    distance: float
    duration: float

class Solution(BaseModel):
    order: List[int]
    totalDistance: float
    totalDuration: float
    legs: List[Leg]

class SolveResponse(BaseModel):
    matrix: Matrix
    solutions: Dict[AlgoKey, Optional[Solution]]
    polylines: Optional[Dict[str, Any]] = None
