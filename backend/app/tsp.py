from typing import List, Tuple, Dict, Any

Matrix = Dict[str, List[List[float]]]

def total_for_order(order: List[int], m: Matrix) -> Dict[str, Any]:
    legs = []
    total_d, total_t = 0.0, 0.0
    for a, b in zip(order[:-1], order[1:]):
        d = m['distances'][a][b]
        t = m['durations'][a][b]
        legs.append({"from": a, "to": b, "distance": d, "duration": t})
        total_d += d
        total_t += t
    return {"order": order, "totalDistance": total_d, "totalDuration": total_t, "legs": legs}

# Algorithms

def brute_force(m: Matrix) -> Dict[str, Any] | None:
    import itertools
    n = len(m['durations'])
    if n > 11:
        return None  # safety
    best = None
    for perm in itertools.permutations(range(1, n)):
        order = [0, *perm]
        res = total_for_order(order, m)
        if best is None or res['totalDuration'] < best['totalDuration']:
            best = res
    return best

def nearest_neighbor(m: Matrix) -> Dict[str, Any]:
    n = len(m['durations'])
    unvisited = set(range(1, n))
    order = [0]
    cur = 0
    while unvisited:
        nxt = min(unvisited, key=lambda j: m['durations'][cur][j])
        unvisited.remove(nxt)
        order.append(nxt)
        cur = nxt
    return total_for_order(order, m)

def two_opt(m: Matrix) -> Dict[str, Any]:
    n = len(m['durations'])
    # start with NN
    best = nearest_neighbor(m)
    order = best['order']
    improved = True
    def delta(i, k, order):
        a, b = order[i-1], order[i]
        c, d = order[k], order[(k+1) % len(order)] if k+1 < len(order) else None
        if d is None:
            return 0
        return (m['durations'][a][c] + m['durations'][b][d]) - (m['durations'][a][b] + m['durations'][c][d])
    while improved:
        improved = False
        for i in range(1, n-2):
            for k in range(i+1, n-1):
                if delta(i, k, order) < 0:
                    order[i:k+1] = reversed(order[i:k+1])
                    improved = True
        
    return total_for_order(order, m)

def genetic(m: Matrix, generations: int = 200, pop_size: int = 64, mutation_rate: float = 0.1) -> Dict[str, Any]:
    import random
    n = len(m['durations'])
    def fitness(order):
        return 1.0 / (1e-6 + total_for_order(order, m)['totalDuration'])
    base = list(range(1, n))
    pop = [[0, *random.sample(base, len(base))] for _ in range(pop_size)]
    for _ in range(generations):
        # selection
        pop.sort(key=lambda o: -fitness(o))
        survivors = pop[: pop_size // 4]
        # crossover
        children = []
        while len(children) + len(survivors) < pop_size:
            a, b = random.sample(survivors, 2)
            cut = random.randint(1, n-2)
            middle = [x for x in b[1:] if x not in a[1:cut]]
            child = [0, *a[1:cut], *middle]
            children.append(child)
        pop = survivors + children
        # mutation
        for o in pop:
            if random.random() < mutation_rate and len(o) > 3:
                i, j = random.sample(range(1, len(o)), 2)
                o[i], o[j] = o[j], o[i]
    best = min(pop, key=lambda o: total_for_order(o, m)['totalDuration'])
    return total_for_order(best, m)
