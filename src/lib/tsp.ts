import type { AlgoKey, Matrix, RouteResult } from '../App'

export type GeneticOptions = {
  population?: number
  generations?: number
  mutationRate?: number
  crossoverRate?: number
  eliteFraction?: number
  tournamentSize?: number
}

function totalForOrder(order: number[], m: Matrix) {
  let dist = 0
  let dur = 0
  const legs: RouteResult['legs'] = []
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i], b = order[i + 1]
    // Validate indices
    if (a === undefined || b === undefined || a < 0 || b < 0 || 
        a >= m.distances.length || b >= m.distances.length ||
        !m.distances[a] || !m.distances[a][b]) {
      console.error('Invalid tour:', order, 'at positions', i, i+1, 'nodes', a, b)
      throw new Error(`Invalid tour: node ${a} or ${b} out of bounds`)
    }
    const d = m.distances[a][b]
    const t = m.durations[a][b]
    dist += d
    dur += t
    legs.push({ from: a, to: b, distance: d, duration: t })
  }
  return { dist, dur, legs }
}

function bruteForce(m: Matrix): RouteResult {
  const n = m.distances.length
  const nodes = Array.from({ length: n - 1 }, (_, i) => i + 1)
  let best: { order: number[]; dist: number; dur: number; legs: RouteResult['legs'] } | null = null

  function permute(arr: number[], l: number) {
    if (l === arr.length) {
      const order = [0, ...arr]
      const t = totalForOrder(order, m)
      if (!best || t.dur < best.dur) best = { order, dist: t.dist, dur: t.dur, legs: t.legs }
      return
    }
    for (let i = l; i < arr.length; i++) {
      ;[arr[l], arr[i]] = [arr[i], arr[l]]
      permute(arr, l + 1)
      ;[arr[l], arr[i]] = [arr[i], arr[l]]
    }
  }
  permute(nodes, 0)
  const b = best!
  return { order: b.order, totalDistance: b.dist, totalDuration: b.dur, legs: b.legs }
}

function nearestNeighbor(m: Matrix): RouteResult {
  const n = m.distances.length
  
  // Validate matrix
  if (!m.distances || !m.durations || n === 0) {
    throw new Error('Invalid matrix provided to nearestNeighbor')
  }
  
  const unvisited = new Set<number>(Array.from({ length: n - 1 }, (_, i) => i + 1))
  const order = [0]
  
  while (unvisited.size) {
    const last = order[order.length - 1]
    let best: { node: number; dur: number } | null = null
    
    for (const u of unvisited) {
      // Validate indices before access
      if (!m.durations[last] || m.durations[last][u] === undefined) {
        console.error('Invalid matrix access:', { last, u, n, matrixSize: m.distances.length })
        throw new Error(`Invalid matrix: missing durations[${last}][${u}]`)
      }
      const d = m.durations[last][u]
      if (!best || d < best.dur) best = { node: u, dur: d }
    }
    
    if (!best) {
      throw new Error('Nearest neighbor failed to find next node')
    }
    
    order.push(best.node)
    unvisited.delete(best.node)
  }
  
  const t = totalForOrder(order, m)
  return { order, totalDistance: t.dist, totalDuration: t.dur, legs: t.legs }
}

function genetic(m: Matrix, opts?: GeneticOptions): RouteResult {
  const n = m.distances.length
  const nodes = Array.from({ length: n - 1 }, (_, i) => i + 1)
  
  // Adaptive parameters based on problem size - more conservative for large problems
  // Reduce population and generations for larger problems to improve speed
  // Defaults (adaptive) can be overridden by opts
  const defaultPOP = n < 20 ? 80 : n < 50 ? 60 : 40
  const defaultGEN = n < 20 ? 150 : n < 50 ? 100 : 50
  const defaultEliteFraction = 0.2
  const defaultTournament = Math.min(5, Math.floor(defaultPOP * 0.15))
  const defaultMut = 0.2
  const defaultCross = 0.8

  const POP = opts?.population ?? defaultPOP
  const GEN = opts?.generations ?? defaultGEN
  const ELITE_SIZE = Math.max(1, Math.floor(POP * (opts?.eliteFraction ?? defaultEliteFraction))) // Keep at least 1
  const TOURNAMENT_SIZE = opts?.tournamentSize ?? Math.max(2, Math.min(POP, defaultTournament))
  const MUT_RATE = opts?.mutationRate ?? defaultMut
  const CROSS_RATE = opts?.crossoverRate ?? defaultCross
  
  function randOrder() {
    const a = nodes.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return [0, ...a]
  }
  
  function fitness(order: number[]) {
    try {
      return totalForOrder(order, m).dur
    } catch (e) {
      // Invalid tour, return worst possible fitness
      return Infinity
    }
  }
  
  // Validate a tour
  function isValidTour(order: number[]): boolean {
    if (order.length !== n) return false
    if (order[0] !== 0) return false
    const seen = new Set(order)
    if (seen.size !== n) return false // Duplicates
    for (let i = 0; i < n; i++) {
      if (!seen.has(i)) return false // Missing node
    }
    return true
  }
  
  // Order Crossover (OX) - preserves relative order from parents
  function orderCrossover(parent1: number[], parent2: number[]): number[] {
    const size = parent1.length - 1 // Exclude fixed starting point
    if (size < 2) return parent1.slice() // Too small to crossover
    
    const start = 1 + Math.floor(Math.random() * (size - 1))
    const end = start + 1 + Math.floor(Math.random() * (size - start))
    
    const child = new Array(parent1.length).fill(-1)
    child[0] = 0 // Keep starting point
    
    // Copy segment from parent1
    for (let i = start; i <= end && i < parent1.length; i++) {
      child[i] = parent1[i]
    }
    
    // Fill remaining from parent2 in order
    const usedGenes = new Set(child.filter(g => g !== -1))
    let childIdx = 1
    
    for (let i = 1; i < parent2.length; i++) {
      const gene = parent2[i]
      if (!usedGenes.has(gene)) {
        // Find next empty slot
        while (childIdx < child.length && child[childIdx] !== -1) {
          childIdx++
        }
        if (childIdx < child.length) {
          child[childIdx] = gene
          usedGenes.add(gene)
        }
      }
    }
    
    // Safety check: if any position is still -1, fill with missing nodes
    const allNodes = new Set(Array.from({ length: n }, (_, i) => i))
    for (let i = 1; i < child.length; i++) {
      if (child[i] === -1) {
        // Find a missing node
        for (const node of allNodes) {
          if (!usedGenes.has(node) && node !== 0) {
            child[i] = node
            usedGenes.add(node)
            break
          }
        }
      }
    }
    
    return child
  }
  
  // Inversion Mutation - reverses a random segment (like 2-opt)
  function inversionMutate(order: number[]): number[] {
    if (Math.random() > MUT_RATE) return order
    
    const o = order.slice()
    const i = 1 + Math.floor(Math.random() * (o.length - 2))
    const j = i + 1 + Math.floor(Math.random() * (o.length - i - 1))
    
    // Reverse segment between i and j
    const segment = o.slice(i, j + 1).reverse()
    for (let k = 0; k < segment.length; k++) {
      o[i + k] = segment[k]
    }
    
    return o
  }
  
  // Swap Mutation - swaps two random positions
  function swapMutate(order: number[]): number[] {
    if (Math.random() > MUT_RATE) return order
    
    const o = order.slice()
    const i = 1 + Math.floor(Math.random() * (o.length - 1))
    const j = 1 + Math.floor(Math.random() * (o.length - 1))
    ;[o[i], o[j]] = [o[j], o[i]]
    
    return o
  }
  
  // Tournament selection
  function tournament(pop: number[][], fitnesses: number[]): number[] {
    let best = Math.floor(Math.random() * pop.length)
    for (let i = 1; i < TOURNAMENT_SIZE; i++) {
      const candidate = Math.floor(Math.random() * pop.length)
      if (fitnesses[candidate] < fitnesses[best]) {
        best = candidate
      }
    }
    return pop[best].slice()
  }
  
  // Initialize population with some heuristic solutions
  let pop = Array.from({ length: POP }, randOrder)
  
  // Seed with nearest neighbor solution for better starting point
  pop[0] = nearestNeighbor(m).order
  
  // For larger problems, seed a few more with greedy solutions
  if (n > 30 && POP > 10) {
    for (let i = 1; i < Math.min(5, POP); i++) {
      pop[i] = nearestNeighbor(m).order // Multiple NN runs can give different results
    }
  }
  
  let bestEver: number[] | null = null
  let bestEverFitness = Infinity
  let stagnantGens = 0
  const MAX_STAGNANT = n > 50 ? 15 : 25 // Early stopping for large problems
  
  for (let g = 0; g < GEN; g++) {
    // Calculate all fitnesses once
    const fitnesses = pop.map(fitness)
    
    // Track best solution
    const genBestIdx = fitnesses.indexOf(Math.min(...fitnesses))
    if (fitnesses[genBestIdx] < bestEverFitness) {
      bestEverFitness = fitnesses[genBestIdx]
      bestEver = pop[genBestIdx].slice()
      stagnantGens = 0
    } else {
      stagnantGens++
    }
    
    // Early stopping if no improvement for too long
    if (stagnantGens > MAX_STAGNANT) {
      break
    }
    
    // Sort population by fitness for elitism
    const indexed = pop.map((ind, i) => ({ ind, fit: fitnesses[i] }))
    indexed.sort((a, b) => a.fit - b.fit)
    pop = indexed.map(x => x.ind)
    
    // Keep elite
    const elite = pop.slice(0, ELITE_SIZE)
    const newPop: number[][] = [...elite]
    
    // Generate new population
    while (newPop.length < POP) {
      let child: number[]
      
      if (Math.random() < CROSS_RATE) {
        // Crossover
        const p1 = tournament(pop, fitnesses)
        const p2 = tournament(pop, fitnesses)
        child = orderCrossover(p1, p2)
        
        // Apply mutation (mix of inversion and swap)
        if (Math.random() < 0.5) {
          child = inversionMutate(child)
        } else {
          child = swapMutate(child)
        }
      } else {
        // Just mutate a selected parent
        const parent = tournament(pop, fitnesses)
        child = inversionMutate(parent)
      }
      
      // Validate before adding
      if (isValidTour(child)) {
        newPop.push(child)
      } else {
        // If invalid, use a random valid tour instead
        newPop.push(randOrder())
      }
    }
    
    pop = newPop
    
    // Increase mutation rate if stagnant
    if (stagnantGens > 20 && Math.random() < 0.3) {
      // Introduce random individual for diversity
      pop[pop.length - 1] = randOrder()
    }
  }
  
  // Final sort to get best
  pop.sort((a, b) => fitness(a) - fitness(b))
  const order = bestEver || pop[0]
  const t = totalForOrder(order, m)
  return { order, totalDistance: t.dist, totalDuration: t.dur, legs: t.legs }
}

export function computeTSP(algo: AlgoKey, m: Matrix, extra?: { options?: GeneticOptions }): RouteResult | null {
  // Validate matrix structure
  if (!m || !m.distances || !m.durations) {
    throw new Error('Invalid matrix: missing distances or durations')
  }
  
  const n = m.distances.length
  if (n === 0) {
    throw new Error('Invalid matrix: empty distances array')
  }
  
  if (m.durations.length !== n) {
    throw new Error(`Invalid matrix: distances length (${n}) != durations length (${m.durations.length})`)
  }
  
  // Validate matrix is square
  for (let i = 0; i < n; i++) {
    if (!m.distances[i] || m.distances[i].length !== n) {
      throw new Error(`Invalid matrix: row ${i} has incorrect length`)
    }
    if (!m.durations[i] || m.durations[i].length !== n) {
      throw new Error(`Invalid matrix: durations row ${i} has incorrect length`)
    }
  }
  
  switch (algo) {
    case 'brute_force':
      if (m.distances.length > 11) {
        // safety: brute force explodes factorially; skip for large sets
        // O(n!) - 12! = 479,001,600 permutations is too much
        return null
      }
      return bruteForce(m)
    case 'nearest_neighbor':
      return nearestNeighbor(m)
    case 'genetic':
      return genetic(m, extra?.options)
  }
}
