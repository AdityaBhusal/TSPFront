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
    
    durations = m["durations"]
    n = len(durations)

    # ---- Helpers ----

    def cost(order: List[int]) -> float:
        """Total duration of a route."""
        return total_for_order(order, m)["totalDuration"]

    def fitness(order: List[int]) -> float:
        """Higher fitness = shorter duration."""
        return 1.0 / (1e-9 + cost(order))

    def next_unvisited_in_parent(parent, current, visited):
        """SCX helper."""
        try:
            idx = parent.index(current)
        except ValueError:
            for c in parent:
                if c not in visited:
                    return c
            return None

        for offset in range(1, len(parent) + 1):
            cand = parent[(idx + offset) % len(parent)]
            if cand not in visited:
                return cand
        return None

    def scx(p1, p2):
        """Sequential Constructive Crossover."""
        child = [0]
        visited = {0}
        current = 0
        
        while len(child) < n:
            c1 = next_unvisited_in_parent(p1, current, visited)
            c2 = next_unvisited_in_parent(p2, current, visited)

            if c1 is None and c2 is None:
                # add remaining
                for c in p1:
                    if c not in visited:
                        child.append(c)
                break

            if c1 is None:
                chosen = c2
            elif c2 is None:
                chosen = c1
            else:
                d1 = durations[current][c1]
                d2 = durations[current][c2]
                chosen = c1 if d1 < d2 else c2

            child.append(chosen)
            visited.add(chosen)
            current = chosen

        return child

    def mutate(order):
        if random.random() < mutation_rate and len(order) > 3:
            i, j = random.sample(range(1, len(order)), 2)
            order[i], order[j] = order[j], order[i]

    # ---- initialize population ----
    base = list(range(1, n))
    pop = [[0, *random.sample(base, len(base))] for _ in range(pop_size)]

    # ---- GA loop ----
    for _ in range(generations):
        # Evaluate + sort (best = first)
        pop.sort(key=lambda o: cost(o))
        
        # Elitism: keep best 25%
        elite_size = max(2, pop_size // 4)
        elites = pop[:elite_size]

        new_pop = elites[:]
        while len(new_pop) < pop_size:
            p1, p2 = random.sample(elites, 2)
            child = scx(p1, p2)
            mutate(child)
            new_pop.append(child)

        pop = new_pop

    best = min(pop, key=cost)
    return total_for_order(best, m)

