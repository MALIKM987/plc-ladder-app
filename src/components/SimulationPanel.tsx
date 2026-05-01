const signalStates = [
  { name: 'Start', value: 'FALSE' },
  { name: 'Stop', value: 'FALSE' },
  { name: 'Motor', value: 'FALSE' },
  { name: 'Alarm', value: 'FALSE' },
]

export function SimulationPanel() {
  return (
    <aside className="panel panel--right" aria-labelledby="simulation-panel-title">
      <div className="panel__header">
        <h2 id="simulation-panel-title">Panel symulacji</h2>
      </div>

      <div className="simulation-summary">
        <span>Status</span>
        <strong>Zatrzymana</strong>
      </div>

      <div className="signal-list">
        {signalStates.map((signal) => (
          <div key={signal.name} className="signal-row">
            <span>{signal.name}</span>
            <code>{signal.value}</code>
          </div>
        ))}
      </div>
    </aside>
  )
}
