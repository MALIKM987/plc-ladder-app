import type { Dispatch, SetStateAction } from 'react'
import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type { TranslationKey } from '../i18n/translations'
import {
  autoLayoutRung,
  createBoolVariable,
  createCounterVariable,
  createTimerVariable,
  getRequiredVariableType,
  removeConnection,
  removeElement,
  updateElementVariable,
  updateRung,
  updateVariable,
} from '../project/projectActions'
import type {
  LadderElement,
  Project,
  Rung,
  Variable,
  VariableType,
} from '../types/project'

type PropertiesPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  selectedElementId: string | null
  selectedEdgeId: string | null
  selectedRungId: string | null
  onClearSelection: () => void
  t: (key: TranslationKey) => string
}

function getElementTypeLabel(element: LadderElement) {
  return element.type
}

function getVariableName(project: Project, variableId: string) {
  return (
    project.variables.find((variable) => variable.id === variableId)?.name ??
    variableId
  )
}

function getEndpointDisplayName(project: Project, elementId: string) {
  if (elementId === LEFT_RAIL_ID) {
    return 'L+'
  }

  if (elementId === RIGHT_RAIL_ID) {
    return 'R'
  }

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

function findRung(project: Project, rungId: string | null) {
  if (!rungId) {
    return undefined
  }

  return project.rungs.find((rung) => rung.id === rungId)
}

function createVariableForType(project: Project, variableType: VariableType) {
  if (variableType === 'TIMER') {
    return createTimerVariable(project)
  }

  if (variableType === 'COUNTER') {
    return createCounterVariable(project)
  }

  return createBoolVariable(project)
}

export function PropertiesPanel({
  project,
  setProject,
  simulationStatus,
  selectedElementId,
  selectedEdgeId,
  selectedRungId,
  onClearSelection,
  t,
}: PropertiesPanelProps) {
  const canEdit = simulationStatus !== 'RUN'
  const elementSelection = findElementSelection(project, selectedElementId)
  const edgeSelection = findEdgeSelection(project, selectedEdgeId)
  const rungSelection = findRung(project, selectedRungId)

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
      const nextProject = createVariableForType(currentProject, expectedType)
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

  const handlePresetMsChange = (variable: Variable, presetValue: string) => {
    if (!canEdit || variable.type !== 'TIMER') {
      return
    }

    const presetMs = Math.max(0, Number(presetValue) || 0)

    setProject((currentProject) =>
      updateVariable(currentProject, variable.id, { presetMs }),
    )
  }

  const handleCounterPresetChange = (
    variable: Variable,
    presetValue: string,
  ) => {
    if (!canEdit || variable.type !== 'COUNTER') {
      return
    }

    const preset = Math.max(0, Number(presetValue) || 0)

    setProject((currentProject) =>
      updateVariable(currentProject, variable.id, { preset }),
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
            {getEndpointDisplayName(project, edge.fromElementId)} {' -> '}
            {getEndpointDisplayName(project, edge.toElementId)}
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

  if (elementSelection) {
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
            <input value={getElementTypeLabel(element)} disabled readOnly />
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

          {selectedVariable?.type === 'TIMER' && (
            <div className="properties-timer">
              <label>
                PT
                <input
                  type="number"
                  min="0"
                  value={selectedVariable.presetMs ?? 1000}
                  disabled={!canEdit}
                  onChange={(event) =>
                    handlePresetMsChange(selectedVariable, event.target.value)
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

          {selectedVariable?.type === 'COUNTER' && (
            <div className="properties-timer">
              <label>
                PV
                <input
                  type="number"
                  min="0"
                  value={selectedVariable.preset ?? 3}
                  disabled={!canEdit}
                  onChange={(event) =>
                    handleCounterPresetChange(
                      selectedVariable,
                      event.target.value,
                    )
                  }
                />
              </label>
              <span>
                CV <code>{selectedVariable.count ?? 0}</code>
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

  if (rungSelection) {
    return (
      <aside className="properties-panel" aria-label={t('properties')}>
        <h3>{t('rungProperties')}</h3>
        <div className="properties-grid">
          <label>
            {t('rungTitle')}
            <input
              value={rungSelection.title ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                setProject((currentProject) =>
                  updateRung(currentProject, rungSelection.id, {
                    title: event.target.value,
                  }),
                )
              }
            />
          </label>
          <label className="properties-grid__wide">
            {t('rungComment')}
            <input
              value={rungSelection.comment ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                setProject((currentProject) =>
                  updateRung(currentProject, rungSelection.id, {
                    comment: event.target.value,
                  }),
                )
              }
            />
          </label>
          <label className="properties-check">
            <input
              type="checkbox"
              checked={rungSelection.breakpoint ?? false}
              disabled={!canEdit}
              onChange={(event) =>
                setProject((currentProject) =>
                  updateRung(currentProject, rungSelection.id, {
                    breakpoint: event.target.checked,
                  }),
                )
              }
            />
            {t('breakpoint')}
          </label>
          {canEdit && (
            <button
              type="button"
              className="variable-add-button"
              onClick={() =>
                setProject((currentProject) =>
                  autoLayoutRung(currentProject, rungSelection.id),
                )
              }
            >
              {t('autoLayoutRung')}
            </button>
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className="properties-panel" aria-label={t('properties')}>
      <h3>{t('properties')}</h3>
      <p>{t('selectElement')}</p>
    </aside>
  )
}
