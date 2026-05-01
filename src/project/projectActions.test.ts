import { describe, expect, it } from 'vitest'
import {
  addElement,
  addRung,
  addVariable,
  autoLayoutRung,
  GRID_SIZE,
  updateElementPosition,
  updateElementPositions,
} from './projectActions'
import {
  createBoolVariable,
  createElement,
  createProject,
  createRung,
} from '../test/builders'

function createProjectWithSingleElement() {
  const variable = createBoolVariable({ id: 'start', name: 'Start' })
  const element = createElement({
    id: 'contact',
    variableId: variable.id,
    position: { x: 120, y: 70 },
  })

  return createProject({
    variables: [variable],
    rungs: [
      createRung({
        id: 'rung',
        elements: [element],
        connections: [],
      }),
    ],
  })
}

describe('projectActions', () => {
  it('auto-connects addElement by default', () => {
    const project = createProjectWithSingleElement()
    const result = addElement(project, 'rung', 'NO_CONTACT', {
      id: 'second-contact',
      position: { x: 280, y: 70 },
    })

    expect(result.rungs[0].elements).toHaveLength(2)
    expect(result.rungs[0].connections).toEqual([
      expect.objectContaining({
        fromElementId: 'contact',
        toElementId: 'second-contact',
      }),
    ])
  })

  it('can add an element without auto connection', () => {
    const project = createProjectWithSingleElement()
    const result = addElement(project, 'rung', 'NO_CONTACT', {
      id: 'dropped-contact',
      position: { x: 281, y: 73 },
      autoConnect: false,
    })

    expect(result.rungs[0].elements).toHaveLength(2)
    expect(result.rungs[0].connections).toHaveLength(0)
    expect(result.rungs[0].elements[1].position).toEqual({ x: 280, y: 80 })
  })

  it('snaps moved nodes to grid', () => {
    const project = createProjectWithSingleElement()
    const result = updateElementPosition(project, 'contact', { x: 133, y: 68 })

    expect(result.rungs[0].elements[0].position.x % GRID_SIZE).toBe(0)
    expect(result.rungs[0].elements[0].position.y % GRID_SIZE).toBe(0)
  })

  it('updates multiple moved nodes in one immutable action', () => {
    const variable = createBoolVariable({ id: 'start' })
    const first = createElement({ id: 'first', variableId: variable.id })
    const second = createElement({ id: 'second', variableId: variable.id })
    const project = createProject({
      variables: [variable],
      rungs: [
        createRung({
          id: 'rung',
          elements: [first, second],
        }),
      ],
    })
    const result = updateElementPositions(project, {
      first: { x: 133, y: 68 },
      second: { x: 276, y: 92 },
    })

    expect(
      result.rungs[0].elements.find((element) => element.id === 'first')
        ?.position,
    ).toEqual({ x: 140, y: 60 })
    expect(
      result.rungs[0].elements.find((element) => element.id === 'second')
        ?.position,
    ).toEqual({ x: 280, y: 100 })
    expect(project.rungs[0].elements[0].position).toEqual(first.position)
  })

  it('auto-layout aligns rung elements left to right', () => {
    const variable = createBoolVariable({ id: 'start' })
    const project = createProject({
      variables: [variable],
      rungs: [
        createRung({
          id: 'rung',
          elements: [
            createElement({
              id: 'third',
              variableId: variable.id,
              position: { x: 600, y: 30 },
            }),
            createElement({
              id: 'first',
              variableId: variable.id,
              position: { x: 120, y: 100 },
            }),
            createElement({
              id: 'second',
              variableId: variable.id,
              position: { x: 280, y: 10 },
            }),
          ],
        }),
      ],
    })
    const result = autoLayoutRung(project, 'rung')

    expect(
      result.rungs[0].elements.find((element) => element.id === 'first')
        ?.position,
    ).toEqual({ x: 120, y: 70 })
    expect(
      result.rungs[0].elements.find((element) => element.id === 'second')
        ?.position,
    ).toEqual({ x: 280, y: 70 })
    expect(
      result.rungs[0].elements.find((element) => element.id === 'third')
        ?.position,
    ).toEqual({ x: 440, y: 70 })
  })

  it('keeps Project-only actions immutable', () => {
    const project = createProjectWithSingleElement()
    const nextProject = addVariable(addRung(project))

    expect(nextProject).not.toBe(project)
    expect(project.rungs).toHaveLength(1)
    expect(project.variables).toHaveLength(1)
  })
})
