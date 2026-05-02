import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useState,
} from 'react'
import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import { useResponsiveMode } from '../hooks/useResponsiveMode'
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

function formatRungSummary(rung: Rung, t: (key: TranslationKey) => string) {
  const number = String(rung.number).padStart(3, '0')
  const title = rung.title?.trim()

  return title
    ? `${t('rungSummary')} ${number}: ${title}`
    : `${t('rungSummary')} ${number}`
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
  const { isMobile } = useResponsiveMode()
  const elementSelection = findElementSelection(project, selectedElementId)
  const edgeSelection = findEdgeSelection(project, selectedEdgeId)
  const rungSelection = findRung(project, selectedRungId)
  const selectionKey = [
    isMobile ? 'mobile' : 'desktop',
    selectedElementId ?? '',
    selectedEdgeId ?? '',
    selectedRungId ?? '',
  ].join(':')
  const defaultCollapsed =
    isMobile && !selectedElementId && !selectedEdgeId && Boolean(selectedRungId)
  const [collapseState, setCollapseState] = useState({
    isCollapsed: defaultCollapsed,
    selectionKey,
  })
  const isCollapsed =
    collapseState.selectionKey === selectionKey
      ? collapseState.isCollapsed
      : defaultCollapsed

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

  const renderPanel = (
    title: string,
    summary: string,
    content: ReactNode,
  ) => (
    <aside
      className={`properties-panel ${
        isCollapsed ? 'properties-panel--collapsed' : ''
      }`}
      aria-label={t('properties')}
    >
      <div className="properties-panel__header">
        <div className="properties-panel__heading">
          <h3>{title}</h3>
          <p>{summary}</p>
        </div>
        <div className="properties-panel__actions">
          <button
            type="button"
            aria-label={isCollapsed ? t('expandPanel') : t('collapsePanel')}
            title={isCollapsed ? t('expandPanel') : t('collapsePanel')}
            onClick={() =>
              setCollapseState({
                isCollapsed: !isCollapsed,
                selectionKey,
              })
            }
          >
            {isCollapsed ? '+' : '−'}
          </button>
          <button
            type="button"
            aria-label={t('closePanel')}
            title={t('closePanel')}
            onClick={onClearSelection}
          >
            ×
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="properties-panel__body">{content}</div>
      )}
    </aside>
  )

  if (edgeSelection) {
    const { rung, edge } = edgeSelection

    return renderPanel(
      t('properties'),
      `${t('connection')}: ${getEndpointDisplayName(
        project,
        edge.fromElementId,
      )} -> ${getEndpointDisplayName(project, edge.toElementId)}`,
      <>
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
      </>,
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

    return renderPanel(
      t('properties'),
      `${t('elementSummary')}: ${getElementTypeLabel(element)}`,
      <>
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
      </>,
    )
  }

  if (rungSelection) {
    return renderPanel(
      t('rungProperties'),
      formatRungSummary(rungSelection, t),
      <>
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
      </>,
    )
  }

  return renderPanel(t('properties'), t('selectElement'), <p>{t('selectElement')}</p>)
}
