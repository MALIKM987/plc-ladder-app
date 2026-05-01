import type { Dispatch, SetStateAction } from 'react'
import type { TranslationKey } from '../i18n/translations'
import {
  createBoolVariable,
  createCounterVariable,
  createTimerVariable,
  removeVariable,
  updateVariable,
} from '../project/projectActions'
import type { Project, Variable } from '../types/project'

type VariableTableProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  onNotify?: (message: string) => void
  t: (key: TranslationKey) => string
}

const VARIABLE_TYPES: Variable['type'][] = ['BOOL', 'TIMER', 'COUNTER']

function canEditValue(variable: Variable) {
  return (
    variable.type === 'BOOL' &&
    (variable.address.startsWith('%I') || variable.address.startsWith('%M'))
  )
}

function isVariableUsed(project: Project, variableId: string) {
  return project.rungs.some((rung) =>
    rung.elements.some((element) => element.variableId === variableId),
  )
}

export function VariableTable({
  project,
  setProject,
  simulationStatus,
  onNotify,
  t,
}: VariableTableProps) {
  const readOnly = simulationStatus === 'RUN'

  const handleRemoveVariable = (variableId: string) => {
    if (readOnly) {
      return
    }

    if (isVariableUsed(project, variableId)) {
      onNotify?.(t('cannotDeleteUsedVariable'))
      return
    }

    setProject((currentProject) => removeVariable(currentProject, variableId))
  }

  const handleVariableChange = (
    variableId: string,
    patch: Partial<Omit<Variable, 'id'>>,
  ) => {
    if (readOnly) {
      return
    }

    setProject((currentProject) =>
      updateVariable(currentProject, variableId, patch),
    )
  }

  const handleNumberChange = (
    variableId: string,
    key: 'presetMs' | 'preset' | 'count',
    value: string,
  ) => {
    handleVariableChange(variableId, {
      [key]: Math.max(0, Number(value) || 0),
    })
  }

  return (
    <section className="variables" aria-labelledby="variables-title">
      <div className="panel__header variables__header">
        <h2 id="variables-title">{t('variableTable')}</h2>
        <div className="variable-add-group">
          <button
            type="button"
            className="variable-add-button"
            disabled={readOnly}
            onClick={() =>
              setProject((currentProject) => createBoolVariable(currentProject))
            }
          >
            {t('addBoolVariable')}
          </button>
          <button
            type="button"
            className="variable-add-button"
            disabled={readOnly}
            onClick={() =>
              setProject((currentProject) =>
                createTimerVariable(currentProject),
              )
            }
          >
            {t('addTimerVariable')}
          </button>
          <button
            type="button"
            className="variable-add-button"
            disabled={readOnly}
            onClick={() =>
              setProject((currentProject) =>
                createCounterVariable(currentProject),
              )
            }
          >
            {t('addCounterVariable')}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('type')}</th>
              <th>{t('address')}</th>
              <th>{t('value')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {project.variables.map((variable) => {
              const valueEditable = !readOnly && canEditValue(variable)

              return (
                <tr key={variable.id}>
                  <td>
                    <input
                      className="variable-field"
                      aria-label={`${t('name')} ${variable.name}`}
                      value={variable.name}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleVariableChange(variable.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="variable-field"
                      aria-label={`${t('type')} ${variable.name}`}
                      value={variable.type}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleVariableChange(variable.id, {
                          type: event.target.value as Variable['type'],
                        })
                      }
                    >
                      {VARIABLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="variable-field"
                      aria-label={`${t('address')} ${variable.name}`}
                      value={variable.address}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleVariableChange(variable.id, {
                          address: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    {variable.type === 'TIMER' && (
                      <div className="timer-variable-fields">
                        <label>
                          PT
                          <input
                            className="variable-field variable-field--number"
                            type="number"
                            min="0"
                            value={variable.presetMs ?? 1000}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleNumberChange(
                                variable.id,
                                'presetMs',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <span>
                          ET <code>{variable.elapsedMs ?? 0} ms</code>
                        </span>
                        <span>
                          Q <code>{variable.done ? 'TRUE' : 'FALSE'}</code>
                        </span>
                      </div>
                    )}

                    {variable.type === 'COUNTER' && (
                      <div className="timer-variable-fields">
                        <label>
                          PV
                          <input
                            className="variable-field variable-field--number"
                            type="number"
                            min="0"
                            value={variable.preset ?? 3}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleNumberChange(
                                variable.id,
                                'preset',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          CV
                          <input
                            className="variable-field variable-field--number"
                            type="number"
                            min="0"
                            value={variable.count ?? 0}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleNumberChange(
                                variable.id,
                                'count',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <span>
                          Q <code>{variable.done ? 'TRUE' : 'FALSE'}</code>
                        </span>
                      </div>
                    )}

                    {variable.type === 'BOOL' && (
                      <button
                        type="button"
                        className="variable-value-button"
                        disabled={!valueEditable}
                        onClick={() =>
                          handleVariableChange(variable.id, {
                            value: !variable.value,
                          })
                        }
                      >
                        {variable.value ? 'TRUE' : 'FALSE'}
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="variable-delete-button"
                      disabled={readOnly}
                      onClick={() => handleRemoveVariable(variable.id)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
