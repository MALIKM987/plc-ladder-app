/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type DragEvent, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LADDER_ELEMENT_DRAG_TYPE } from '../../constants/dragDrop'
import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../../constants/rails'
import { translations, type TranslationKey } from '../../i18n/translations'
import {
  connect,
  connectLeft,
  connectRight,
  createBoolVariable,
  createElement,
  createProject,
  createRung,
} from '../../test/builders'
import type { Project } from '../../types/project'
import { LadderEditor } from '../LadderEditor'

vi.mock('reactflow', () => {
  return {
    default: ({
      nodes,
      edges,
      nodesDraggable,
      elementsSelectable,
      onNodeClick,
      onDragOver,
      onDrop,
      children,
    }: {
      nodes: Array<{ id: string; data: { variableName?: string; label?: string } }>
      edges: Array<{ id: string }>
      nodesDraggable: boolean
      elementsSelectable: boolean
      onDragOver?: (event: DragEvent<HTMLDivElement>) => void
      onDrop?: (event: DragEvent<HTMLDivElement>) => void
      onNodeClick?: (
        event: { stopPropagation: () => void },
        node: { id: string },
      ) => void
      children: ReactNode
    }) => (
      <div
        data-testid="react-flow"
        data-elements-selectable={String(elementsSelectable)}
        data-nodes-draggable={String(nodesDraggable)}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            data-testid={`flow-node-${node.id}`}
            onClick={() =>
              onNodeClick?.({ stopPropagation: vi.fn() }, { id: node.id })
            }
          >
            {node.data.variableName ?? node.data.label ?? node.id}
          </button>
        ))}
        {edges.map((edge) => (
          <span key={edge.id} data-testid={`flow-edge-${edge.id}`} />
        ))}
        {children}
      </div>
    ),
    Background: () => <div data-testid="flow-background" />,
    Controls: () => <div data-testid="flow-controls" />,
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
  }
})

const t = (key: TranslationKey) => translations.pl[key]

function createEditorProject() {
  const start = createBoolVariable({
    id: 'start',
    name: 'Start',
    address: '%I0.0',
    value: false,
  })
  const motor = createBoolVariable({
    id: 'motor',
    name: 'Motor',
    address: '%Q0.0',
    value: false,
  })
  const contact = createElement({
    id: 'contact',
    type: 'NO_CONTACT',
    variableId: start.id,
  })
  const coil = createElement({
    id: 'coil',
    type: 'COIL',
    variableId: motor.id,
  })

  return createProject({
    variables: [start, motor],
    rungs: [
      createRung({
        elements: [contact, coil],
        connections: [
          connectLeft(contact.id),
          connect(contact.id, coil.id),
          connectRight(coil.id),
        ],
      }),
    ],
  })
}

function LadderEditorHarness({
  initialProject,
  simulationStatus = 'STOP',
}: {
  initialProject: Project
  simulationStatus?: 'RUN' | 'STOP'
}) {
  const [project, setProject] = useState(initialProject)

  return (
    <LadderEditor
      project={project}
      setProject={setProject}
      simulationStatus={simulationStatus}
      simulationState={null}
      showDebug
      t={t}
    />
  )
}

describe('LadderEditor', () => {
  it('renders nodes and rails', () => {
    render(<LadderEditorHarness initialProject={createEditorProject()} />)

    expect(screen.getByTestId(`flow-node-${LEFT_RAIL_ID}`)).toBeInTheDocument()
    expect(screen.getByTestId('flow-node-contact')).toHaveTextContent('Start')
    expect(screen.getByTestId(`flow-node-${RIGHT_RAIL_ID}`)).toBeInTheDocument()
  })

  it('selects a clicked node', () => {
    render(<LadderEditorHarness initialProject={createEditorProject()} />)

    fireEvent.click(screen.getByTestId('flow-node-contact'))

    expect(screen.getByDisplayValue('NO_CONTACT')).toBeInTheDocument()
  })

  it('locks editing in RUN', () => {
    render(
      <LadderEditorHarness
        initialProject={createEditorProject()}
        simulationStatus="RUN"
      />,
    )

    expect(screen.queryByText('+ Dodaj szczebel')).not.toBeInTheDocument()
    expect(screen.getByTestId('react-flow')).toHaveAttribute(
      'data-nodes-draggable',
      'false',
    )
    expect(screen.getByTestId('react-flow')).toHaveAttribute(
      'data-elements-selectable',
      'false',
    )
  })

  it('drops exactly one element without creating an automatic connection', () => {
    const dataTransfer = {
      dropEffect: '',
      getData: vi.fn((type: string) =>
        type === LADDER_ELEMENT_DRAG_TYPE ? 'NC_CONTACT' : '',
      ),
    }

    render(<LadderEditorHarness initialProject={createEditorProject()} />)

    expect(screen.getAllByTestId(/^flow-node-/)).toHaveLength(4)
    expect(screen.getAllByTestId(/^flow-edge-/)).toHaveLength(3)

    fireEvent.drop(screen.getByTestId('react-flow'), {
      clientX: 420,
      clientY: 120,
      dataTransfer,
    })

    expect(screen.getAllByTestId(/^flow-node-/)).toHaveLength(5)
    expect(screen.getAllByTestId(/^flow-edge-/)).toHaveLength(3)
    expect(screen.getByDisplayValue('NC_CONTACT')).toBeInTheDocument()
  })
})
