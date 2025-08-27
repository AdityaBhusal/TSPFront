import type { Pin } from '../App'

type Props = {
  pins: Pin[]
  onRename: (index: number, name: string) => void
}

export function StopsEditor({ pins, onRename }: Props) {
  if (pins.length === 0) return null
  return (
    <section>
      <h3>Stops</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pins.map((p, i) => (
          <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 56 }}>{i === 0 ? 'Start' : `Stop ${i}`}:</span>
            <input
              type="text"
              placeholder={i === 0 ? 'Source name' : `Name for stop ${i}`}
              value={p.label ?? ''}
              onChange={(e) => onRename(i, e.target.value)}
              style={{ flex: 1 }}
            />
          </label>
        ))}
      </div>
    </section>
  )
}
