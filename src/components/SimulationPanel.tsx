import type { Dispatch, SetStateAction } from 'react'
import type { TranslationKey } from '../i18n/translations'
import type { SimulationState } from '../simulator/simulationState'
import type { Project, Variable } from '../types/project'

type SimulationPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  scanCount: number
  scanIntervalMs: number
  simulationState: SimulationState | null
  showDebug: boolean
  t: (key: TranslationKey) => string
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
  simulationState,
  showDebug,
  t,
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
        <h2 id="simulation-panel-title">{t('panelSimulation')}</h2>
      </div>

      <div className="simulation-summary">
        <div className="simulation-summary__item">
          <span>{t('status')}</span>
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
          <span>{t('scanInterval')}</span>
          <strong>{scanIntervalMs} ms</strong>
        </div>
        <div className="simulation-summary__item">
          <span>{t('scan')}</span>
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

      {showDebug && (
        <div className="debug-panel">
          <div className="panel__header panel__header--compact">
            <h3>{t('debugPanel')}</h3>
          </div>
          <dl className="debug-panel__grid">
            <dt>{t('scan')}</dt>
            <dd>{scanCount}</dd>
            <dt>{t('activeElements')}</dt>
            <dd>{simulationState?.activeElementIds.length ?? 0}</dd>
            <dt>{t('activeConnections')}</dt>
            <dd>{simulationState?.activeConnectionIds.length ?? 0}</dd>
          </dl>
          <div className="debug-panel__details">
            <strong>{t('value')}</strong>
            {project.variables.map((variable) => (
              <span key={variable.id}>
                {variable.name}: {formatValue(variable.value)}
              </span>
            ))}
          </div>
          {simulationState?.breakpointRungId && (
            <p className="debug-panel__breakpoint">
              {t('breakpointHit')}: {simulationState.breakpointRungId}
            </p>
          )}
        </div>
      )}
    </aside>
  )
}
