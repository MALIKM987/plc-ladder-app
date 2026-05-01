import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactFlow, {
  Background,
  Controls,
  type Connection as FlowConnection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { LADDER_ELEMENT_DRAG_TYPE } from '../constants/dragDrop'
import type { TranslationKey } from '../i18n/translations'
import {
  addConnection,
  addElement,
  addRung,
  removeConnection,
  removeElement,
  removeRung,
  updateElementPosition,
} from '../project/projectActions'
import type { SimulationState } from '../simulator/simulationState'
import type { ElementType, LadderElement, Project, Rung } from '../types/project'
import { LadderNode, type LadderNodeData } from './LadderNode'
import { PropertiesPanel } from './PropertiesPanel'

type LadderEditorProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  simulationState: SimulationState | null
  showDebug: boolean
  t: (key: TranslationKey) => string
}

const nodeTypes = {
  ladderNode: LadderNode,
}

function createElementId() {
  return `element-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getVariableName(variableId: string, project: Project) {
  return (
    project.variables.find((candidate) => candidate.id === variableId)?.name ??
    'Brak zmiennej'
  )
}

function getVariable(variableId: string, project: Project) {
  return project.variables.find((candidate) => candidate.id === variableId)
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

  return `${elementIndex + 1}:${getVariableName(element?.variableId ?? '', project)}`
}

function isElementType(value: string): value is ElementType {
  return (
    value === 'NO_CONTACT' ||
    value === 'NC_CONTACT' ||
    value === 'COIL' ||
    value === 'TON'
  )
}

function isInputContact(element: LadderElement, project: Project) {
  const variable = getVariable(element.variableId, project)

  return (
    (element.type === 'NO_CONTACT' || element.type === 'NC_CONTACT') &&
    variable?.type === 'BOOL' &&
    variable.address.startsWith('%I')
  )
}

function mapRungToNodes(
  rung: Rung,
  project: Project,
  selectedElementId: string | null,
  simulationStatus: 'RUN' | 'STOP',
  simulationState: SimulationState | null,
  t: (key: TranslationKey) => string,
): Node<LadderNodeData>[] {
  return rung.elements.map((element) => {
    const variable = getVariable(element.variableId, project)
    const inputToggleable =
      simulationStatus === 'RUN' && isInputContact(element, project)

    return {
      id: element.id,
      type: 'ladderNode',
      position: element.position,
      selected: selectedElementId === element.id,
      data: {
        elementType: element.type,
        variableName: variable?.name ?? t('noVariables'),
        isActive:
          simulationState?.activeElementIds.includes(element.id) ?? false,
        isInputToggleable: inputToggleable,
        inputToggleTitle: inputToggleable ? t('inputToggleHint') : undefined,
        timerPresetMs: variable?.presetMs,
        timerElapsedMs: variable?.elapsedMs,
        timerDone: variable?.done,
      },
    }
  })
}

function mapRungToEdges(
  rung: Rung,
  selectedEdgeIds: string[],
  simulationState: SimulationState | null,
): Edge[] {
  return rung.connections.map((connection) => {
    const active =
      simulationState?.activeConnectionIds.includes(connection.id) ?? false

    return {
      id: connection.id,
      source: connection.fromElementId,
      target: connection.toElementId,
      type: 'smoothstep',
      animated: active,
      className: active ? 'ladder-edge--active' : undefined,
      style: active ? { stroke: '#15803d', strokeWidth: 3 } : undefined,
      selected: selectedEdgeIds.includes(connection.id),
      selectable: true,
      focusable: true,
      interactionWidth: 80,
    }
  })
}

export function LadderEditor({
  project,
  setProject,
  simulationStatus,
  simulationState,
  showDebug,
  t,
}: LadderEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  )
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const flowInstancesRef = useRef(new Map<string, ReactFlowInstance>())
  const canEdit = simulationStatus !== 'RUN'

  const clearSelection = () => {
    setSelectedElementId(null)
    setSelectedEdgeIds([])
  }

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

    clearSelection()
    setProject((currentProject) => removeRung(currentProject, rungId))
  }

  const handleAddElement = (
    rungId: string,
    type: ElementType,
    position?: { x: number; y: number },
  ) => {
    if (!canEdit) {
      return
    }

    const elementId = createElementId()

    setSelectedElementId(elementId)
    setSelectedEdgeIds([])
    setProject((currentProject) =>
      addElement(currentProject, rungId, type, {
        id: elementId,
        position,
      }),
    )
  }

  const toggleInputElement = (elementId: string) => {
    setProject((currentProject) => {
      const element = currentProject.rungs
        .flatMap((rung) => rung.elements)
        .find((candidate) => candidate.id === elementId)

      if (!element || !isInputContact(element, currentProject)) {
        return currentProject
      }

      return {
        ...currentProject,
        variables: currentProject.variables.map((variable) =>
          variable.id === element.variableId
            ? { ...variable, value: !variable.value }
            : { ...variable },
        ),
        rungs: currentProject.rungs.map((rung) => ({
          ...rung,
          elements: rung.elements.map((rungElement) => ({
            ...rungElement,
            position: { ...rungElement.position },
          })),
          connections: rung.connections.map((connection) => ({
            ...connection,
          })),
        })),
      }
    })
  }

  const handleNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'select') {
        setSelectedElementId((currentElementId) =>
          change.selected
            ? change.id
            : currentElementId === change.id
              ? null
              : currentElementId,
        )
        setSelectedEdgeIds([])
      }
    }

    if (!canEdit) {
      return
    }

    setProject((currentProject) =>
      changes.reduce((nextProject, change) => {
        if (change.type !== 'position' || !change.position) {
          return nextProject
        }

        return updateElementPosition(nextProject, change.id, change.position)
      }, currentProject),
    )
  }

  const handleConnect = (rungId: string, connection: FlowConnection) => {
    if (!canEdit || !connection.source || !connection.target) {
      return
    }

    setProject((currentProject) =>
      addConnection(
        currentProject,
        rungId,
        connection.source as string,
        connection.target as string,
      ),
    )
    setSelectedEdgeIds([])
  }

  const handleEdgesChange = (rungId: string, changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === 'select') {
        setSelectedEdgeIds((currentEdgeIds) => {
          if (change.selected) {
            return [change.id]
          }

          return currentEdgeIds.filter((edgeId) => edgeId !== change.id)
        })
        setSelectedElementId(null)
      }
    }

    if (!canEdit) {
      return
    }

    const removedEdgeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id)

    if (removedEdgeIds.length === 0) {
      return
    }

    setSelectedEdgeIds((currentEdgeIds) =>
      currentEdgeIds.filter((edgeId) => !removedEdgeIds.includes(edgeId)),
    )
    setProject((currentProject) =>
      removedEdgeIds.reduce(
        (nextProject, edgeId) =>
          removeConnection(nextProject, rungId, edgeId),
        currentProject,
      ),
    )
  }

  const handleEdgesDelete = (rungId: string, deletedEdges: Edge[]) => {
    if (!canEdit) {
      return
    }

    setProject((currentProject) =>
      deletedEdges.reduce(
        (nextProject, edge) => removeConnection(nextProject, rungId, edge.id),
        currentProject,
      ),
    )
    setSelectedEdgeIds((currentEdgeIds) =>
      currentEdgeIds.filter(
        (edgeId) => !deletedEdges.some((edge) => edge.id === edgeId),
      ),
    )
  }

  const handleNodesDelete = (
    rungId: string,
    deletedNodes: Array<Node<LadderNodeData>>,
  ) => {
    if (!canEdit) {
      return
    }

    clearSelection()
    setProject((currentProject) =>
      deletedNodes.reduce(
        (nextProject, node) =>
          removeElement(nextProject, rungId, node.id, { reconnect: false }),
        currentProject,
      ),
    )
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (rungId: string, event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) {
      return
    }

    event.preventDefault()

    const elementType =
      event.dataTransfer.getData(LADDER_ELEMENT_DRAG_TYPE) ||
      event.dataTransfer.getData('text/plain')

    if (!isElementType(elementType)) {
      return
    }

    const flowInstance = flowInstancesRef.current.get(rungId)
    const flowPosition = flowInstance?.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    const bounds = event.currentTarget.getBoundingClientRect()
    const fallbackPosition = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    const droppedPosition = flowPosition ?? fallbackPosition
    const position = {
      x: Math.max(0, droppedPosition.x - 64),
      y: Math.max(0, droppedPosition.y - 22),
    }

    handleAddElement(rungId, elementType, position)
  }

  const projectRungs = useMemo(
    () =>
      project.rungs.map((rung) => ({
        rung,
        nodes: mapRungToNodes(
          rung,
          project,
          selectedElementId,
          simulationStatus,
          simulationState,
          t,
        ),
        edges: mapRungToEdges(rung, selectedEdgeIds, simulationState),
      })),
    [
      project,
      selectedElementId,
      selectedEdgeIds,
      simulationState,
      simulationStatus,
      t,
    ],
  )

  return (
    <section className="editor" aria-labelledby="ladder-editor-title">
      <div className="panel__header editor__header">
        <div>
          <h2 id="ladder-editor-title">{t('ladderEditor')}</h2>
          <p>{project.name}</p>
        </div>
        <span className="editor__status">
          {simulationStatus === 'RUN' ? t('runMode') : t('editMode')}
        </span>
      </div>

      <div className="ladder-canvas" aria-label={t('ladderEditor')}>
        {projectRungs.map(({ rung, nodes, edges }) => (
          <div key={rung.id} className="ladder-rung">
            <div className="ladder-rung__rail ladder-rung__rail--left" />
            <div className="ladder-rung__rail ladder-rung__rail--right" />
            <div className="ladder-rung__start-line" />
            <div className="ladder-rung__end-line" />

            <div className="ladder-rung__meta">
              <span className="ladder-rung__number">
                {String(rung.number).padStart(3, '0')}
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="rung-delete-button"
                  aria-label={`${t('removeRung')} ${rung.number}`}
                  onClick={() => handleRemoveRung(rung.id)}
                >
                  X
                </button>
              )}
            </div>

            <div
              className="rung-flow"
              data-testid={`rung-flow-${rung.number}`}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(rung.id, event)}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={canEdit}
                nodesConnectable={canEdit}
                nodesFocusable={canEdit}
                edgesFocusable={canEdit}
                elementsSelectable={canEdit}
                panOnDrag={canEdit}
                zoomOnScroll={false}
                zoomOnPinch={canEdit}
                preventScrolling={false}
                deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
                onNodeClick={(event, node) => {
                  event.stopPropagation()

                  if (simulationStatus === 'RUN') {
                    toggleInputElement(node.id)
                    return
                  }

                  setSelectedElementId(node.id)
                  setSelectedEdgeIds([])
                }}
                onEdgeClick={(event, edge) => {
                  event.stopPropagation()

                  if (!canEdit) {
                    return
                  }

                  setSelectedEdgeIds([edge.id])
                  setSelectedElementId(null)
                }}
                onPaneClick={() => {
                  if (canEdit) {
                    clearSelection()
                  }
                }}
                onNodesChange={handleNodesChange}
                onInit={(flowInstance) => {
                  flowInstancesRef.current.set(rung.id, flowInstance)
                }}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(rung.id, event)}
                onNodesDelete={(deletedNodes) =>
                  handleNodesDelete(rung.id, deletedNodes)
                }
                onConnect={(connection) => handleConnect(rung.id, connection)}
                onEdgesChange={(changes) =>
                  handleEdgesChange(rung.id, changes)
                }
                onEdgesDelete={(deletedEdges) =>
                  handleEdgesDelete(rung.id, deletedEdges)
                }
                fitView
                fitViewOptions={{ padding: 0.25 }}
              >
                <Background gap={28} size={1} color="#d6dde5" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            {showDebug && (
              <div
                className="rung-debug"
                aria-label={`${t('debugConnections')} ${rung.number}`}
              >
                <strong>{t('debugConnections')}</strong>
                {rung.connections.length === 0 ? (
                  <span>{t('none')}</span>
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
            )}
          </div>
        ))}

        {canEdit && (
          <div className="editor-actions">
            <button
              type="button"
              className="add-rung-button"
              onClick={handleAddRung}
            >
              {t('addRung')}
            </button>
          </div>
        )}
      </div>

      <PropertiesPanel
        project={project}
        setProject={setProject}
        simulationStatus={simulationStatus}
        selectedElementId={selectedElementId}
        selectedEdgeId={selectedEdgeIds[0] ?? null}
        onClearSelection={clearSelection}
        t={t}
      />
    </section>
  )
}
