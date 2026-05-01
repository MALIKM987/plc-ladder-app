import { type Dispatch, type SetStateAction, useState } from 'react'
import {
  addElement,
  addRung,
  removeElement,
  removeRung,
  updateElementVariable,
} from '../project/projectActions'
import type { ElementType, LadderElement, Project } from '../types/project'

type LadderEditorProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
}

const elementActions: Array<{ label: string; type: ElementType }> = [
  { label: '+ Styk NO', type: 'NO_CONTACT' },
  { label: '+ Styk NC', type: 'NC_CONTACT' },
  { label: '+ Cewka', type: 'COIL' },
]

function getElementClass(type: ElementType) {
  return type === 'COIL' ? 'ladder-coil' : 'ladder-contact'
}

function getElementLabel(element: LadderElement, project: Project) {
  const variable = project.variables.find(
    (candidate) => candidate.id === element.variableId,
  )
  const variableName = variable?.name ?? 'Brak zmiennej'

  if (element.type === 'NC_CONTACT') {
    return `|/| ${variableName}`
  }

  if (element.type === 'COIL') {
    return `( ) ${variableName}`
  }

  return `| | ${variableName}`
}

function getElementDebugName(
  elementId: string,
  elements: LadderElement[],
  project: Project,
) {
  const sortedElements = [...elements].sort(
    (first, second) => first.position.x - second.position.x,
  )
  const element = sortedElements.find((candidate) => candidate.id === elementId)
  const elementIndex = sortedElements.findIndex(
    (candidate) => candidate.id === elementId,
  )
  const variable = project.variables.find(
    (candidate) => candidate.id === element?.variableId,
  )

  return `${elementIndex + 1}:${variable?.name ?? elementId}`
}

export function LadderEditor({
  project,
  setProject,
  simulationStatus,
}: LadderEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  )
  const canEdit = simulationStatus !== 'RUN'

  const handleAddRung = () => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) => addRung(currentProject))
  }

  const handleRemoveRung = (rungId: string) => {
    if (!canEdit) {
      return
    }

    setSelectedElementId(null)
    setProject((currentProject) => removeRung(currentProject, rungId))
  }

  const handleAddElement = (rungId: string, type: ElementType) => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) => addElement(currentProject, rungId, type))
  }

  const handleRemoveElement = (rungId: string, elementId: string) => {
    if (!canEdit) {
      return
    }

    setSelectedElementId(null)
    setProject((currentProject) =>
      removeElement(currentProject, rungId, elementId),
    )
  }

  const handleVariableChange = (elementId: string, variableId: string) => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) =>
      updateElementVariable(currentProject, elementId, variableId),
    )
  }

  return (
    <section className="editor" aria-labelledby="ladder-editor-title">
      <div className="panel__header editor__header">
        <div>
          <h2 id="ladder-editor-title">Edytor drabinkowy</h2>
          <p>{project.name}</p>
        </div>
        <span className="editor__status">
          {simulationStatus === 'RUN' ? 'Symulacja RUN' : 'Tryb edycji'}
        </span>
      </div>

      <div className="ladder-canvas" aria-label="Podgląd szczebli drabinki">
        <div className="ladder-bus ladder-bus--left" aria-hidden="true" />
        <div className="ladder-bus ladder-bus--right" aria-hidden="true" />

        {project.rungs.map((rung) => {
          const elements = [...rung.elements].sort(
            (first, second) => first.position.x - second.position.x,
          )

          return (
            <div key={rung.id} className="ladder-rung">
              <div className="ladder-rung__meta">
                <span className="ladder-rung__number">
                  {String(rung.number).padStart(3, '0')}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    className="rung-delete-button"
                    aria-label={`Usuń szczebel ${rung.number}`}
                    onClick={() => handleRemoveRung(rung.id)}
                  >
                    X
                  </button>
                )}
              </div>

              <div className="ladder-line" aria-hidden="true" />

              <div className="ladder-elements">
                {elements.map((element) => {
                  const selected = selectedElementId === element.id

                  return (
                    <div key={element.id} className="ladder-element">
                      <button
                        type="button"
                        className={`${getElementClass(element.type)} ${
                          selected ? 'ladder-element--selected' : ''
                        }`}
                        onClick={() => setSelectedElementId(element.id)}
                      >
                        {getElementLabel(element, project)}
                      </button>

                      {selected && (
                        <div className="element-editor">
                          <select
                            aria-label={`Zmienna elementu ${getElementLabel(
                              element,
                              project,
                            )}`}
                            value={element.variableId}
                            disabled={!canEdit}
                            onChange={(event) =>
                              handleVariableChange(
                                element.id,
                                event.target.value,
                              )
                            }
                          >
                            {project.variables.length === 0 ? (
                              <option value="">Brak zmiennych</option>
                            ) : (
                              project.variables.map((variable) => (
                                <option key={variable.id} value={variable.id}>
                                  {variable.name}
                                </option>
                              ))
                            )}
                          </select>

                          {canEdit && (
                            <button
                              type="button"
                              className="element-delete-button"
                              onClick={() =>
                                handleRemoveElement(rung.id, element.id)
                              }
                            >
                              Usuń
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {canEdit && (
                <div className="rung-actions">
                  {elementActions.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      className="rung-action-button"
                      onClick={() => handleAddElement(rung.id, action.type)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="rung-debug" aria-label={`Połączenia szczebla ${rung.number}`}>
                <strong>connections:</strong>
                {rung.connections.length === 0 ? (
                  <span>brak</span>
                ) : (
                  rung.connections.map((connection) => (
                    <span key={connection.id}>
                      {getElementDebugName(
                        connection.fromElementId,
                        rung.elements,
                        project,
                      )}
                      {' -> '}
                      {getElementDebugName(
                        connection.toElementId,
                        rung.elements,
                        project,
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>
          )
        })}

        {canEdit && (
          <div className="editor-actions">
            <button
              type="button"
              className="add-rung-button"
              onClick={handleAddRung}
            >
              + Dodaj szczebel
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
