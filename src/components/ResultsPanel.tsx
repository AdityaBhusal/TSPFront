import type { AlgoKey, RouteResult, Pin } from '../App'

type Props = {
  results: Record<AlgoKey, RouteResult | null>
  pins: Pin[]
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return [h ? `${h}h` : null, m ? `${m}m` : null, s ? `${s}s` : null].filter(Boolean).join(' ') || '0s'
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`
}

export function ResultsPanel({ results, pins }: Props) {
  const entries = Object.entries(results).filter(([, v]) => v) as Array<[AlgoKey, RouteResult]>
  if (entries.length === 0) return <section><h3>Results</h3><p>No results yet.</p></section>
  return (
    <section>
      <h3>Results</h3>
      {entries.map(([algo, r]) => {
        // Build ETA array aligned with each stop in the order (first stop ETA=0)
        const etaAt: number[] = [0]
        let sum = 0
        for (const leg of r.legs) { sum += leg.duration; etaAt.push(sum) }
        return (
          <div key={algo} className="result-item">
            <h4>{algo.replace('_', ' ')}</h4>
            <p>Total distance: {fmtDist(r.totalDistance)} | Total time: {fmtTime(r.totalDuration)}</p>
            <div>
              <strong>Ordered stops</strong>
              <ol>
                {r.order.map((pinIndex, i) => {
                  const leg = i > 0 ? r.legs[i - 1] : undefined
                  const displayName = pins[pinIndex]?.label ?? `Pin ${pinIndex}`
                  return (
                    <li key={`${pinIndex}-${i}`}>
                      {i === 0 ? 'Start: ' : 'Stop '}{i}: {displayName}
                      {typeof leg !== 'undefined' && (
                        <>
                          {' '}
                          — leg: {fmtDist(leg.distance)} | {fmtTime(leg.duration)}
                        </>
                      )}
                      {' '} (ETA: {fmtTime(etaAt[i])})
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        )
      })}
    </section>
  )
}
