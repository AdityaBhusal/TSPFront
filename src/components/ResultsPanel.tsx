import type { AlgoKey, RouteResult } from '../App'

type Props = {
  results: Record<AlgoKey, RouteResult | null>
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

export function ResultsPanel({ results }: Props) {
  const entries = Object.entries(results).filter(([, v]) => v) as Array<[AlgoKey, RouteResult]>
  if (entries.length === 0) return <section><h3>Results</h3><p>No results yet.</p></section>
  return (
    <section>
      <h3>Results</h3>
      {entries.map(([algo, r]) => {
        let eta = 0
        const etaList = r.legs.map((leg) => (eta += leg.duration))
        return (
          <div key={algo} className="result-item">
            <h4>{algo.replace('_', ' ')}</h4>
            <p>Total distance: {fmtDist(r.totalDistance)} | Total time: {fmtTime(r.totalDuration)}</p>
            <ol>
              {r.legs.map((leg, idx) => (
                <li key={idx}>
                  Stop {leg.to}: {fmtDist(leg.distance)} | {fmtTime(leg.duration)} (ETA: {fmtTime(etaList[idx])})
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </section>
  )
}
