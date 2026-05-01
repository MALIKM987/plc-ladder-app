import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  type Connection as FlowConnection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { LadderNode, type LadderNodeData } from './LadderNode'
import {
  addConnection,
  addElement,
  addRung,
  removeConnection,
  removeElement,
  removeRung,
  updateElementPosition,
  updateElementVariable,
} from '../project/projectActions'
import type { SimulationState } from '../simulator/simulationState'
import type { ElementType, LadderElement, Project, Rung } from '../types/project'

type LadderEditorProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  simulationState: SimulationState | null
}

const elementActions: Array<{ label: string; type: ElementType }> = [
  { label: '+ Styk NO', type: 'NO_CONTACT' },
  { label: '+ Styk NC', type: 'NC_CONTACT' },
  { label: '+ Cewka', type: 'COIL' },
  { label: '+ Timer TON', type: 'TON' },
]

const nodeTypes = {
  ladderNode: LadderNode,
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

function getSelectedElement(project: Project, selectedElementId: string | null) {
  if (!selectedElementId) {
    return undefined
  }

  return project.rungs
    .flatMap((rung) => rung.elements)
    .find((element) => element.id === selectedElementId)
}

function mapRungToNodes(
  rung: Rung,
  project: Project,
  selectedElementId: string | null,
  simulationState: SimulationState | null,
): Node<LadderNodeData>[] {
  return rung.elements.map((element) => {
    const variable = getVariable(element.variableId, project)

    return {
      id: element.id,
      type: 'ladderNode',
      position: element.position,
      selected: selectedElementId === element.id,
      data: {
        elementType: element.type,
        variableName: variable?.name ?? 'Brak zmiennej',
        isActive:
          simulationState?.activeElementIds.includes(element.id) ?? false,
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
  return rung.connections.map((connection) => ({
    id: connection.id,
    source: connection.fromElementId,
    target: connection.toElementId,
    type: 'smoothstep',
    animated:
      simulationState?.activeConnectionIds.includes(connection.id) ?? false,
    className:
      simulationState?.activeConnectionIds.includes(connection.id) ?? false
        ? 'ladder-edge--active'
        : undefined,
    style:
      simulationState?.activeConnectionIds.includes(connection.id) ?? false
        ? { stroke: '#15803d', strokeWidth: 3 }
        : undefined,
    selected: selectedEdgeIds.includes(connection.id),
    selectable: true,
    focusable: true,
    interactionWidth: 80,
  }))
}

export function LadderEditor({
  project,
  setProject,
  simulationStatus,
  simulationState,
}: LadderEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  )
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const canEdit = simulationStatus !== 'RUN'
  const selectedElement = getSelectedElement(project, selectedElementId)

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
    setSelectedEdgeIds([])
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
    setSelectedEdgeIds([])
    setProject((currentProject) =>
      removeElement(currentProject, rungId, elementId, { reconnect: false }),
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

    setSelectedElementId(null)
    setSelectedEdgeIds([])
    setProject((currentProject) =>
      deletedNodes.reduce(
        (nextProject, node) =>
          removeElement(nextProject, rungId, node.id, { reconnect: false }),
        currentProject,
      ),
    )
  }

  const projectRungs = useMemo(
    () =>
      project.rungs.map((rung) => ({
        rung,
        nodes: mapRungToNodes(
          rung,
          project,
          selectedElementId,
          simulationState,
        ),
        edges: mapRungToEdges(rung, selectedEdgeIds, simulationState),
      })),
    [project, selectedElementId, selectedEdgeIds, simulationState],
  )

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

        {projectRungs.map(({ rung, nodes, edges }) => (
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

            <div
              className="rung-flow"
              data-testid={`rung-flow-${rung.number}`}
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
                panOnDrag
                zoomOnScroll={false}
                zoomOnPinch
                preventScrolling={false}
                deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
                onNodeClick={(event, node) => {
                  event.stopPropagation()
                  setSelectedElementId(node.id)
                }}
                onEdgeClick={(event, edge) => {
                  event.stopPropagation()
                  setSelectedEdgeIds([edge.id])
                  setSelectedElementId(null)
                }}
                onPaneClick={() => {
                  setSelectedElementId(null)
                  setSelectedEdgeIds([])
                }}
                onNodesChange={handleNodesChange}
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

            {selectedElement &&
              rung.elements.some((element) => element.id === selectedElement.id) && (
                <div className="element-editor rung-element-editor">
                  <select
                    aria-label={`Zmienna elementu ${selectedElement.id}`}
                    value={selectedElement.variableId}
                    disabled={!canEdit}
                    onChange={(event) =>
                      handleVariableChange(
                        selectedElement.id,
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
                        handleRemoveElement(rung.id, selectedElement.id)
                      }
                    >
                      Usuń
                    </button>
                  )}
                </div>
              )}

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

            <div
              className="rung-debug"
              aria-label={`Połączenia szczebla ${rung.number}`}
            >
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
        ))}

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
