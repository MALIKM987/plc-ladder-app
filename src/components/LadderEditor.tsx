const rungs = [
  { id: '001', input: 'Start', output: 'Motor' },
  { id: '002', input: 'Stop', output: 'Alarm' },
  { id: '003', input: 'Sensor_1', output: 'Valve_A' },
]

export function LadderEditor() {
  return (
    <section className="editor" aria-labelledby="ladder-editor-title">
      <div className="panel__header editor__header">
        <div>
          <h2 id="ladder-editor-title">Edytor drabinkowy</h2>
          <p>Obszar roboczy programu LD</p>
        </div>
        <span className="editor__status">Tryb edycji</span>
      </div>

      <div className="ladder-canvas" aria-label="Podgląd szczebli drabinki">
        <div className="ladder-bus ladder-bus--left" aria-hidden="true" />
        <div className="ladder-bus ladder-bus--right" aria-hidden="true" />

        {rungs.map((rung) => (
          <div key={rung.id} className="ladder-rung">
            <span className="ladder-rung__number">{rung.id}</span>
            <div className="ladder-line" aria-hidden="true" />
            <div className="ladder-contact">| | {rung.input}</div>
            <div className="ladder-coil">( ) {rung.output}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
