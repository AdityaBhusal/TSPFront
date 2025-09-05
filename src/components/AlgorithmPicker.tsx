import type { AlgoKey } from '../App'
import type React from 'react'

type Props = {
  selected: AlgoKey[]
  onChange: (algos: AlgoKey[]) => void
  canCompute: boolean
  onCompute: () => void
}

const labels: Record<AlgoKey, string> = {
  brute_force: 'Brute Force',
  nearest_neighbor: 'Nearest Neighbor',
  two_opt: '2-Opt',
  genetic: 'Genetic',
}

export function AlgorithmPicker({ selected, onChange, canCompute, onCompute }: Props) {
  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const values = Array.from(e.target.selectedOptions as unknown as HTMLOptionElement[]).map((o) => o.value as AlgoKey)
    onChange(values)
  }

  return (
    <section>
      <h3>Algorithms</h3>
      {canCompute ? (
        <>
          <label>
            Choose algorithms:
            <select multiple size={4} value={selected} onChange={onSelectChange} style={{ width: '100%', marginTop: 4 }}>
              {(Object.keys(labels) as AlgoKey[]).map((a) => (
                <option key={a} value={a}>{labels[a]}</option>
              ))}
            </select>
          </label>
          <button style={{ marginTop: 8 }} onClick={onCompute}>Compute Route</button>
        </>
      ) : (
  <p className="hint">Add at least 3 pins (first is the source) to enable algorithm selection.</p>
      )}
    </section>
  )
}
