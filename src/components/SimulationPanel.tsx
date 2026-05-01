import type { Dispatch, SetStateAction } from 'react'
import type { Project, Variable } from '../types/project'

type SimulationPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  scanCount: number
  scanIntervalMs: number
}

function isInputVariable(variable: Variable) {
  return variable.address.startsWith('%I')
}

function formatValue(value: boolean) {
  return value ? 'TRUE' : 'FALSE'
}

export function SimulationPanel({
  project,
  setProject,
  simulationStatus,
  scanCount,
  scanIntervalMs,
}: SimulationPanelProps) {
  const toggleInputValue = (variableId: string) => {
    setProject((currentProject) => ({
      ...currentProject,
      variables: currentProject.variables.map((variable) =>
        variable.id === variableId
          ? { ...variable, value: !variable.value }
          : variable,
      ),
    }))
  }

  return (
    <aside className="panel panel--right" aria-labelledby="simulation-panel-title">
      <div className="panel__header">
        <h2 id="simulation-panel-title">Panel symulacji</h2>
      </div>

      <div className="simulation-summary">
        <div className="simulation-summary__item">
          <span>Status</span>
          <strong
            className={
              simulationStatus === 'RUN'
                ? 'simulation-summary__status--run'
                : 'simulation-summary__status--stop'
            }
          >
            {simulationStatus === 'RUN' ? 'RUN' : 'STOP'}
          </strong>
        </div>
        <div className="simulation-summary__item">
          <span>Scan interval</span>
          <strong>{scanIntervalMs} ms</strong>
        </div>
        <div className="simulation-summary__item">
          <span>Scan</span>
          <strong>{scanCount}</strong>
        </div>
      </div>

      <div className="signal-list">
        {project.variables.map((variable) => {
          const inputVariable = isInputVariable(variable)
          const content = (
            <>
              <span>
                {variable.name}
                <small>{variable.address}</small>
              </span>
              <code>{formatValue(variable.value)}</code>
            </>
          )

          if (inputVariable) {
            return (
              <button
                key={variable.id}
                type="button"
                className="signal-row signal-row--input"
                onClick={() => toggleInputValue(variable.id)}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={variable.id} className="signal-row">
              {content}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
