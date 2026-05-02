import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useEffect,
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
import { LEFT_RAIL_ID, RIGHT_RAIL_ID, isRailId } from '../constants/rails'
import type { TranslationKey } from '../i18n/translations'
import {
  addConnection,
  addElement,
  addElementsToRung,
  addRung,
  createId,
  removeConnection,
  removeElement,
  removeRung,
  snapPosition,
  updateElementPositions,
} from '../project/projectActions'
import type { SimulationState } from '../simulator/simulationState'
import type {
  Connection,
  ElementType,
  LadderElement,
  Project,
  Rung,
} from '../types/project'
import { LadderNode, type LadderNodeData } from './LadderNode'
import { MobileBlockPicker } from './MobileBlockPicker'
import { PropertiesPanel } from './PropertiesPanel'
import { RailNode, type RailNodeData } from './RailNode'

type LadderEditorProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  simulationState: SimulationState | null
  showDebug: boolean
  isMobile?: boolean
  t: (key: TranslationKey) => string
}

type CopiedSelection = {
  rungId: string
  elements: LadderElement[]
  connections: Connection[]
}

type LastDrop = {
  rungId: string
  elementType: ElementType
  x: number
  y: number
  timestamp: number
}

const nodeTypes = {
  ladderNode: LadderNode,
  railNode: RailNode,
}

const RAIL_Y = 70
const LEFT_RAIL_X = 0
const RIGHT_RAIL_X = 760
const PASTE_OFFSET = 40
const MOBILE_ADD_POSITION = { x: 360, y: 90 }

function createElementId() {
  return createId('element')
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

function getEndpointDebugName(
  elementId: string,
  elements: LadderElement[],
  project: Project,
) {
  if (elementId === LEFT_RAIL_ID) {
    return 'L+'
  }

  if (elementId === RIGHT_RAIL_ID) {
    return 'R'
  }

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
    value === 'TON' ||
    value === 'TOF' ||
    value === 'TP' ||
    value === 'CTU' ||
    value === 'CTD' ||
    value === 'SET_COIL' ||
    value === 'RESET_COIL'
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
  selectedElementIds: string[],
  simulationStatus: 'RUN' | 'STOP',
  simulationState: SimulationState | null,
  t: (key: TranslationKey) => string,
): Array<Node<LadderNodeData | RailNodeData>> {
  const elementNodes: Array<Node<LadderNodeData | RailNodeData>> =
    rung.elements.map((element) => {
      const variable = getVariable(element.variableId, project)
      const inputToggleable =
        simulationStatus === 'RUN' && isInputContact(element, project)

      return {
        id: element.id,
        type: 'ladderNode',
        position: element.position,
        selected: selectedElementIds.includes(element.id),
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
          counterPreset: variable?.preset,
          counterCount: variable?.count,
          counterDone: variable?.done,
        },
      }
    })

  return [
    {
      id: LEFT_RAIL_ID,
      type: 'railNode',
      position: { x: LEFT_RAIL_X, y: RAIL_Y },
      selectable: false,
      draggable: false,
      data: { label: 'L+', side: 'left' },
    },
    ...elementNodes,
    {
      id: RIGHT_RAIL_ID,
      type: 'railNode',
      position: { x: RIGHT_RAIL_X, y: RAIL_Y },
      selectable: false,
      draggable: false,
      data: { label: 'R', side: 'right' },
    },
  ]
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

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function LadderEditor({
  project,
  setProject,
  simulationStatus,
  simulationState,
  showDebug,
  isMobile = false,
  t,
}: LadderEditorProps) {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [selectedRungId, setSelectedRungId] = useState<string | null>(
    project.rungs[0]?.id ?? null,
  )
  const [copiedSelection, setCopiedSelection] =
    useState<CopiedSelection | null>(null)
  const [pickerRungId, setPickerRungId] = useState<string | null>(null)
  const flowInstancesRef = useRef(new Map<string, ReactFlowInstance>())
  const lastDropRef = useRef<LastDrop | null>(null)
  const canEdit = simulationStatus !== 'RUN'

  const clearSelection = () => {
    setSelectedElementIds([])
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
    setSelectedRungId(null)
    setProject((currentProject) => removeRung(currentProject, rungId))
  }

  const handleAddElement = (
    rungId: string,
    type: ElementType,
    position?: { x: number; y: number },
    autoConnect = true,
  ) => {
    if (!canEdit) {
      return
    }

    const elementId = createElementId()

    setSelectedElementIds([elementId])
    setSelectedEdgeIds([])
    setSelectedRungId(rungId)
    setProject((currentProject) =>
      addElement(currentProject, rungId, type, {
        id: elementId,
        position,
        autoConnect,
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

  const copySelectedElements = () => {
    if (!selectedRungId || selectedElementIds.length === 0) {
      return
    }

    const rung = project.rungs.find((candidate) => candidate.id === selectedRungId)

    if (!rung) {
      return
    }

    const selectedIds = new Set(selectedElementIds)
    const elements = rung.elements
      .filter((element) => selectedIds.has(element.id))
      .map((element) => ({ ...element, position: { ...element.position } }))
    const connections = rung.connections
      .filter(
        (connection) =>
          selectedIds.has(connection.fromElementId) &&
          selectedIds.has(connection.toElementId),
      )
      .map((connection) => ({ ...connection }))

    setCopiedSelection({ rungId: rung.id, elements, connections })
  }

  const pasteSelectedElements = () => {
    if (!copiedSelection || !selectedRungId || !canEdit) {
      return
    }

    const idMap = new Map<string, string>()
    const elements = copiedSelection.elements.map((element) => {
      const nextId = createId('element')

      idMap.set(element.id, nextId)

      return {
        ...element,
        id: nextId,
        position: snapPosition({
          x: element.position.x + PASTE_OFFSET,
          y: element.position.y + PASTE_OFFSET,
        }),
      }
    })
    const connections = copiedSelection.connections
      .map((connection) => {
        const fromElementId = idMap.get(connection.fromElementId)
        const toElementId = idMap.get(connection.toElementId)

        if (!fromElementId || !toElementId) {
          return undefined
        }

        return {
          id: createId('connection'),
          fromElementId,
          toElementId,
        }
      })
      .filter((connection): connection is Connection => Boolean(connection))

    setSelectedElementIds(elements.map((element) => element.id))
    setSelectedEdgeIds([])
    setProject((currentProject) =>
      addElementsToRung(currentProject, selectedRungId, elements, connections),
    )
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copySelectedElements()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteSelectedElements()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const handleNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'select' && !isRailId(change.id)) {
        setSelectedElementIds((currentElementIds) => {
          if (change.selected) {
            return [...new Set([...currentElementIds, change.id])]
          }

          return currentElementIds.filter((elementId) => elementId !== change.id)
        })
        setSelectedEdgeIds([])
      }
    }

    // Position changes are intentionally committed only on drag stop.
    // This keeps mobile dragging smooth and creates one undo entry per drag.
  }

  const handleNodeDragStop = (
    node: Node<LadderNodeData | RailNodeData>,
    draggedNodes: Array<Node<LadderNodeData | RailNodeData>> = [node],
  ) => {
    if (!canEdit || isRailId(node.id)) {
      return
    }

    const positionsToCommit = Object.fromEntries(
      draggedNodes
        .filter((draggedNode) => !isRailId(draggedNode.id))
        .map((draggedNode) => [
          draggedNode.id,
          snapPosition(draggedNode.position),
        ]),
    )

    if (Object.keys(positionsToCommit).length === 0) {
      return
    }

    setProject((currentProject) =>
      updateElementPositions(currentProject, positionsToCommit),
    )
  }

  const handleNodesDelete = (
    rungId: string,
    deletedNodes: Array<Node<LadderNodeData | RailNodeData>>,
  ) => {
    if (!canEdit) {
      return
    }

    const deletedElementNodes = deletedNodes.filter((node) => !isRailId(node.id))

    clearSelection()
    setProject((currentProject) =>
      deletedElementNodes.reduce(
        (nextProject, node) =>
          removeElement(nextProject, rungId, node.id, { reconnect: false }),
        currentProject,
      ),
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
    setSelectedRungId(rungId)
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
        setSelectedElementIds([])
        setSelectedRungId(rungId)
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
    event.stopPropagation()

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
    const position = snapPosition({
      x: Math.max(0, droppedPosition.x - 64),
      y: Math.max(0, droppedPosition.y - 22),
    })
    const lastDrop = lastDropRef.current
    const duplicateDrop =
      lastDrop &&
      lastDrop.rungId === rungId &&
      lastDrop.elementType === elementType &&
      lastDrop.x === position.x &&
      lastDrop.y === position.y &&
      event.timeStamp - lastDrop.timestamp < 100

    if (duplicateDrop) {
      return
    }

    lastDropRef.current = {
      rungId,
      elementType,
      x: position.x,
      y: position.y,
      timestamp: event.timeStamp,
    }

    handleAddElement(rungId, elementType, position, false)
  }

  const handleNodeClick = (
    event: { ctrlKey?: boolean; metaKey?: boolean },
    rungId: string,
    nodeId: string,
  ) => {
    if (isRailId(nodeId)) {
      return
    }

    if (simulationStatus === 'RUN') {
      toggleInputElement(nodeId)
      return
    }

    setSelectedRungId(rungId)
    setSelectedEdgeIds([])
    setSelectedElementIds((currentElementIds) => {
      if (event.ctrlKey || event.metaKey) {
        return currentElementIds.includes(nodeId)
          ? currentElementIds.filter((elementId) => elementId !== nodeId)
          : [...currentElementIds, nodeId]
      }

      return [nodeId]
    })
  }

  const projectRungs = useMemo(
    () =>
      project.rungs.map((rung) => ({
        rung,
        nodes: mapRungToNodes(
          rung,
          project,
          selectedElementIds,
          simulationStatus,
          simulationState,
          t,
        ),
        edges: mapRungToEdges(rung, selectedEdgeIds, simulationState),
      })),
    [
      project,
      selectedElementIds,
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
            <div className="ladder-rung__meta">
              <span className="ladder-rung__number">
                {String(rung.number).padStart(3, '0')}
              </span>
              <span className="ladder-rung__title">
                {rung.title || t('rungUntitled')}
              </span>
              {rung.breakpoint && (
                <span className="breakpoint-badge">BP</span>
              )}
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
              {canEdit && isMobile && (
                <button
                  type="button"
                  className="mobile-add-block-button"
                  onClick={() => {
                    setSelectedRungId(rung.id)
                    setPickerRungId(rung.id)
                  }}
                >
                  {t('addBlock')}
                </button>
              )}
            </div>

            <div
              className="rung-flow"
              data-testid={`rung-flow-${rung.number}`}
            >
              {rung.elements.length === 0 && canEdit && (
                <div className="rung-empty-state">
                  {t('emptyRungHint')}
                </div>
              )}
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
                multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
                onNodeClick={(event, node) => {
                  event.stopPropagation()
                  handleNodeClick(event, rung.id, node.id)
                }}
                onEdgeClick={(event, edge) => {
                  event.stopPropagation()

                  if (!canEdit) {
                    return
                  }

                  setSelectedEdgeIds([edge.id])
                  setSelectedElementIds([])
                  setSelectedRungId(rung.id)
                }}
                onPaneClick={() => {
                  if (canEdit) {
                    clearSelection()
                    setSelectedRungId(rung.id)
                  }
                }}
                onNodesChange={handleNodesChange}
                onNodeDragStop={(_event, node, nodes) =>
                  handleNodeDragStop(node, nodes)
                }
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
                fitViewOptions={{ padding: 0.22 }}
              >
                <Background gap={20} size={1} color="#d6dde5" />
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
                      {getEndpointDebugName(
                        connection.fromElementId,
                        rung.elements,
                        project,
                      )}
                      {' -> '}
                      {getEndpointDebugName(
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
        selectedElementId={
          selectedElementIds.length === 1 ? selectedElementIds[0] : null
        }
        selectedEdgeId={selectedEdgeIds[0] ?? null}
        selectedRungId={selectedRungId}
        onClearSelection={clearSelection}
        t={t}
      />

      <MobileBlockPicker
        open={Boolean(pickerRungId)}
        t={t}
        onClose={() => setPickerRungId(null)}
        onSelect={(elementType) => {
          if (!pickerRungId) {
            return
          }

          handleAddElement(pickerRungId, elementType, MOBILE_ADD_POSITION, false)
        }}
      />
    </section>
  )
}
