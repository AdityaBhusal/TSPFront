import type { AlgoKey, Matrix, RouteResult } from '../App'

function totalForOrder(order: number[], m: Matrix) {
  let dist = 0
  let dur = 0
  const legs: RouteResult['legs'] = []
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i], b = order[i + 1]
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
  const unvisited = new Set<number>(Array.from({ length: n - 1 }, (_, i) => i + 1))
  const order = [0]
  while (unvisited.size) {
    const last = order[order.length - 1]
    let best: { node: number; dur: number } | null = null
    for (const u of unvisited) {
      const d = m.durations[last][u]
      if (!best || d < best.dur) best = { node: u, dur: d }
    }
    order.push(best!.node)
    unvisited.delete(best!.node)
  }
  const t = totalForOrder(order, m)
  return { order, totalDistance: t.dist, totalDuration: t.dur, legs: t.legs }
}

function twoOpt(m: Matrix): RouteResult {
  // Start with NN, then improve
  let current = nearestNeighbor(m).order
  let improved = true
  function delta(i: number, k: number) {
    const a = current[i]
    const b = current[i + 1]
    const c = current[k]
    const d = current[k + 1]
    const before = m.durations[a][b] + m.durations[c][d]
    const after = m.durations[a][c] + m.durations[b][d]
    return after - before
  }
  while (improved) {
    improved = false
    for (let i = 0; i < current.length - 3; i++) {
      for (let k = i + 1; k < current.length - 2; k++) {
        if (delta(i, k) < 0) {
          const next = current.slice(0, i + 1).concat(current.slice(i + 1, k + 1).reverse(), current.slice(k + 1))
          current = next
          improved = true
        }
      }
    }
  }
  const t = totalForOrder(current, m)
  return { order: current, totalDistance: t.dist, totalDuration: t.dur, legs: t.legs }
}

function genetic(m: Matrix): RouteResult {
  // Tiny GA for demo; not tuned
  const n = m.distances.length
  const nodes = Array.from({ length: n - 1 }, (_, i) => i + 1)
  const POP = 50, GEN = 60, MUT = 0.2
  function randOrder() {
    const a = nodes.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return [0, ...a]
  }
  function fitness(order: number[]) { return totalForOrder(order, m).dur }
  function crossover(a: number[], b: number[]) {
    const start = 1
    const cut = Math.floor(1 + Math.random() * (a.length - 1))
    const seg = a.slice(start, cut)
    const rest = b.filter((x) => x === 0 || !seg.includes(x))
    const child = [0, ...seg, ...rest.filter((x) => x !== 0)]
    return child
  }
  function mutate(o: number[]) {
    if (Math.random() > MUT) return o
    const i = 1 + Math.floor(Math.random() * (o.length - 1))
    const j = 1 + Math.floor(Math.random() * (o.length - 1))
    ;[o[i], o[j]] = [o[j], o[i]]
    return o
  }
  let pop = Array.from({ length: POP }, randOrder)
  for (let g = 0; g < GEN; g++) {
    pop.sort((a, b) => fitness(a) - fitness(b))
    const elite = pop.slice(0, 10)
    const children: number[][] = []
    while (children.length + elite.length < POP) {
      const p1 = pop[Math.floor(Math.random() * 20)]
      const p2 = pop[Math.floor(Math.random() * 20)]
      children.push(mutate(crossover(p1.slice(), p2.slice())))
    }
    pop = [...elite, ...children]
  }
  pop.sort((a, b) => fitness(a) - fitness(b))
  const order = pop[0]
  const t = totalForOrder(order, m)
  return { order, totalDistance: t.dist, totalDuration: t.dur, legs: t.legs }
}

export function computeTSP(algo: AlgoKey, m: Matrix): RouteResult {
  switch (algo) {
    case 'brute_force':
      if (m.distances.length > 9) {
        // safety: brute force explodes factorially; skip for large sets
        return nearestNeighbor(m)
      }
      return bruteForce(m)
    case 'nearest_neighbor':
      return nearestNeighbor(m)
    case 'two_opt':
      return twoOpt(m)
    case 'genetic':
      return genetic(m)
  }
}
