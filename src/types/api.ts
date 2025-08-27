export type AlgoKey = 'brute_force' | 'nearest_neighbor' | 'two_opt' | 'genetic'

export type TspSolveRequest = {
  coordinates: [number, number][]
  sourceIndex: number
  algorithms: AlgoKey[]
  profile?: 'driving' | 'walking' | 'cycling'
}

export type Matrix = { durations: number[][]; distances: number[][] }

export type RouteLeg = { from: number; to: number; distance: number; duration: number }

export type TspSolution = {
  order: number[]
  totalDistance: number
  totalDuration: number
  legs: RouteLeg[]
}

export type TspSolveResponse = {
  matrix: Matrix
  solutions: Partial<Record<AlgoKey, TspSolution | null>>
  polylines?: {
    best?: { type: 'LineString'; coordinates: [number, number][] }
  }
}
