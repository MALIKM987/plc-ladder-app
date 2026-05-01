import type { Dispatch, SetStateAction } from 'react'
import {
  createBoolVariable,
  createTimerVariable,
  removeConnection,
  removeElement,
  updateElementVariable,
  updateVariable,
} from '../project/projectActions'
import type { TranslationKey } from '../i18n/translations'
import type {
  ElementType,
  LadderElement,
  Project,
  Rung,
  Variable,
} from '../types/project'

type PropertiesPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  selectedElementId: string | null
  selectedEdgeId: string | null
  onClearSelection: () => void
  t: (key: TranslationKey) => string
}

function getRequiredVariableType(elementType: ElementType): Variable['type'] {
  return elementType === 'TON' ? 'TIMER' : 'BOOL'
}

function getElementTypeLabel(type: ElementType) {
  if (type === 'NO_CONTACT') {
    return 'NO_CONTACT'
  }

  if (type === 'NC_CONTACT') {
    return 'NC_CONTACT'
  }

  return type
}

function getVariableName(project: Project, variableId: string) {
  return (
    project.variables.find((variable) => variable.id === variableId)?.name ??
    variableId
  )
}

function getElementDisplayName(project: Project, elementId: string) {
  const element = project.rungs
    .flatMap((rung) => rung.elements)
    .find((candidate) => candidate.id === elementId)

  if (!element) {
    return elementId
  }

  return getVariableName(project, element.variableId)
}

function findElementSelection(project: Project, elementId: string | null) {
  if (!elementId) {
    return undefined
  }

  for (const rung of project.rungs) {
    const element = rung.elements.find((candidate) => candidate.id === elementId)

    if (element) {
      return { rung, element }
    }
  }

  return undefined
}

function findEdgeSelection(project: Project, edgeId: string | null) {
  if (!edgeId) {
    return undefined
  }

  for (const rung of project.rungs) {
    const edge = rung.connections.find((candidate) => candidate.id === edgeId)

    if (edge) {
      return { rung, edge }
    }
  }

  return undefined
}

export function PropertiesPanel({
  project,
  setProject,
  simulationStatus,
  selectedElementId,
  selectedEdgeId,
  onClearSelection,
  t,
}: PropertiesPanelProps) {
  const canEdit = simulationStatus !== 'RUN'
  const elementSelection = findElementSelection(project, selectedElementId)
  const edgeSelection = findEdgeSelection(project, selectedEdgeId)

  const handleVariableChange = (elementId: string, variableId: string) => {
    if (!canEdit || !variableId) {
      return
    }

    setProject((currentProject) =>
      updateElementVariable(currentProject, elementId, variableId),
    )
  }

  const handleCreateVariable = (element: LadderElement) => {
    if (!canEdit) {
      return
    }

    const expectedType = getRequiredVariableType(element.type)

    setProject((currentProject) => {
      const nextProject =
        expectedType === 'TIMER'
          ? createTimerVariable(currentProject)
          : createBoolVariable(currentProject)
      const createdVariable = nextProject.variables[nextProject.variables.length - 1]

      if (!createdVariable) {
        return nextProject
      }

      return updateElementVariable(nextProject, element.id, createdVariable.id)
    })
  }

  const handleRemoveElement = (rung: Rung, element: LadderElement) => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) =>
      removeElement(currentProject, rung.id, element.id, { reconnect: false }),
    )
    onClearSelection()
  }

  const handleRemoveConnection = (rung: Rung, connectionId: string) => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) =>
      removeConnection(currentProject, rung.id, connectionId),
    )
    onClearSelection()
  }

  const handlePresetChange = (variable: Variable, presetValue: string) => {
    if (!canEdit || variable.type !== 'TIMER') {
      return
    }

    const presetMs = Math.max(0, Number(presetValue) || 0)

    setProject((currentProject) =>
      updateVariable(currentProject, variable.id, { presetMs }),
    )
  }

  if (edgeSelection) {
    const { rung, edge } = edgeSelection

    return (
      <aside className="properties-panel" aria-label={t('properties')}>
        <h3>{t('properties')}</h3>
        <dl>
          <dt>{t('connection')}</dt>
          <dd>
            {getElementDisplayName(project, edge.fromElementId)} {' -> '}
            {getElementDisplayName(project, edge.toElementId)}
          </dd>
        </dl>
        {canEdit && (
          <button
            type="button"
            className="element-delete-button"
            onClick={() => handleRemoveConnection(rung, edge.id)}
          >
            {t('deleteConnection')}
          </button>
        )}
      </aside>
    )
  }

  if (!elementSelection) {
    return (
      <aside className="properties-panel" aria-label={t('properties')}>
        <h3>{t('properties')}</h3>
        <p>{t('selectElement')}</p>
      </aside>
    )
  }

  const { rung, element } = elementSelection
  const requiredType = getRequiredVariableType(element.type)
  const variables = project.variables.filter(
    (variable) => variable.type === requiredType,
  )
  const selectedVariable = project.variables.find(
    (variable) => variable.id === element.variableId,
  )
  const selectedVariableAllowed = variables.some(
    (variable) => variable.id === element.variableId,
  )

  return (
    <aside className="properties-panel" aria-label={t('properties')}>
      <h3>{t('properties')}</h3>
      <div className="properties-grid">
        <label>
          {t('elementType')}
          <input value={getElementTypeLabel(element.type)} disabled readOnly />
        </label>

        <label>
          {t('variable')}
          <select
            value={selectedVariableAllowed ? element.variableId : ''}
            disabled={!canEdit || variables.length === 0}
            onChange={(event) =>
              handleVariableChange(element.id, event.target.value)
            }
          >
            {!selectedVariableAllowed && (
              <option value="">{t('invalidVariable')}</option>
            )}
            {variables.length === 0 ? (
              <option value="">{t('noVariables')}</option>
            ) : (
              variables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  {variable.name}
                </option>
              ))
            )}
          </select>
        </label>

        {variables.length === 0 && canEdit && (
          <button
            type="button"
            className="variable-add-button"
            onClick={() => handleCreateVariable(element)}
          >
            {t('createVariable')}
          </button>
        )}

        {element.type === 'TON' && selectedVariable?.type === 'TIMER' && (
          <div className="properties-timer">
            <label>
              PT
              <input
                type="number"
                min="0"
                value={selectedVariable.presetMs ?? 1000}
                disabled={!canEdit}
                onChange={(event) =>
                  handlePresetChange(selectedVariable, event.target.value)
                }
              />
            </label>
            <span>
              ET <code>{selectedVariable.elapsedMs ?? 0} ms</code>
            </span>
            <span>
              Q <code>{selectedVariable.done ? 'TRUE' : 'FALSE'}</code>
            </span>
          </div>
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          className="element-delete-button"
          onClick={() => handleRemoveElement(rung, element)}
        >
          {t('deleteElement')}
        </button>
      )}
    </aside>
  )
}
