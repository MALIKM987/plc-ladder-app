import type { Dispatch, SetStateAction } from 'react'
import {
  addVariable,
  removeVariable,
  updateVariable,
} from '../project/projectActions'
import type { Project, Variable } from '../types/project'

type VariableTableProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
}

const VARIABLE_TYPES: Variable['type'][] = ['BOOL', 'TIMER']

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
}: VariableTableProps) {
  const readOnly = simulationStatus === 'RUN'

  const handleAddVariable = () => {
    if (readOnly) {
      return
    }

    setProject((currentProject) => addVariable(currentProject))
  }

  const handleRemoveVariable = (variableId: string) => {
    if (readOnly) {
      return
    }

    if (isVariableUsed(project, variableId)) {
      window.alert('Nie można usunąć zmiennej używanej w drabince.')
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

  const handlePresetChange = (variableId: string, presetValue: string) => {
    const presetMs = Math.max(0, Number(presetValue) || 0)

    handleVariableChange(variableId, { presetMs })
  }

  return (
    <section className="variables" aria-labelledby="variables-title">
      <div className="panel__header variables__header">
        <h2 id="variables-title">Tabela zmiennych</h2>
        <button
          type="button"
          className="variable-add-button"
          disabled={readOnly}
          onClick={handleAddVariable}
        >
          + Dodaj zmienną
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Typ</th>
              <th>Adres</th>
              <th>Wartość</th>
              <th>Akcje</th>
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
                      aria-label={`Nazwa zmiennej ${variable.name}`}
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
                      aria-label={`Typ zmiennej ${variable.name}`}
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
                      aria-label={`Adres zmiennej ${variable.name}`}
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
                    {variable.type === 'TIMER' ? (
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
                              handlePresetChange(
                                variable.id,
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <span>
                          ET <code>{variable.elapsedMs ?? 0} ms</code>
                        </span>
                        <span>
                          Q{' '}
                          <code>
                            {variable.done || variable.value
                              ? 'TRUE'
                              : 'FALSE'}
                          </code>
                        </span>
                      </div>
                    ) : (
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
                      Usuń
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
