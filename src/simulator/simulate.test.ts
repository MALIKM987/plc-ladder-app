import { describe, expect, it } from 'vitest'
import { simulateProjectWithState } from './simulate'
import {
  connect,
  connectLeft,
  connectRight,
  createBoolVariable,
  createCounterVariable,
  createElement,
  createProject,
  createRung,
  createTimerVariable,
} from '../test/builders'
import type { ElementType, Project, Variable } from '../types/project'

function getVariable(project: Project, variableId: string) {
  const variable = project.variables.find((candidate) => candidate.id === variableId)

  if (!variable) {
    throw new Error(`Missing variable ${variableId}`)
  }

  return variable
}

function createContactToCoilProject(options: {
  contactType: 'NO_CONTACT' | 'NC_CONTACT'
  inputValue: boolean
}) {
  const input = createBoolVariable({
    id: 'input',
    name: 'Input',
    address: '%I0.0',
    value: options.inputValue,
  })
  const output = createBoolVariable({
    id: 'output',
    name: 'Output',
    address: '%Q0.0',
    value: false,
  })
  const contact = createElement({
    id: 'contact',
    type: options.contactType,
    variableId: input.id,
    position: { x: 120, y: 70 },
  })
  const coil = createElement({
    id: 'coil',
    type: 'COIL',
    variableId: output.id,
    position: { x: 320, y: 70 },
  })
  const rung = createRung({
    elements: [contact, coil],
    connections: [
      connectLeft(contact.id),
      connect(contact.id, coil.id),
      connectRight(coil.id),
    ],
  })

  return createProject({ variables: [input, output], rungs: [rung] })
}

function createBlockToCoilProject(
  blockType: ElementType,
  blockVariable: Variable,
  inputValue = true,
) {
  const input = createBoolVariable({
    id: 'input',
    name: 'Input',
    address: '%I0.0',
    value: inputValue,
  })
  const output = createBoolVariable({
    id: 'output',
    name: 'Output',
    address: '%Q0.0',
    value: false,
  })
  const contact = createElement({
    id: 'contact',
    type: 'NO_CONTACT',
    variableId: input.id,
    position: { x: 120, y: 70 },
  })
  const block = createElement({
    id: 'block',
    type: blockType,
    variableId: blockVariable.id,
    position: { x: 320, y: 70 },
  })
  const coil = createElement({
    id: 'coil',
    type: 'COIL',
    variableId: output.id,
    position: { x: 520, y: 70 },
  })
  const rung = createRung({
    elements: [contact, block, coil],
    connections: [
      connectLeft(contact.id),
      connect(contact.id, block.id),
      connect(block.id, coil.id),
      connectRight(coil.id),
    ],
  })

  return createProject({
    variables: [input, blockVariable, output],
    rungs: [rung],
  })
}

describe('simulateProjectWithState', () => {
  it('passes TRUE through NO_CONTACT and sets BOOL coil', () => {
    const result = simulateProjectWithState(
      createContactToCoilProject({ contactType: 'NO_CONTACT', inputValue: true }),
      100,
    )

    expect(getVariable(result.project, 'output').value).toBe(true)
    expect(result.state.activeElementIds).toContain('contact')
    expect(result.state.activeElementIds).toContain('coil')
  })

  it('blocks FALSE through NO_CONTACT', () => {
    const result = simulateProjectWithState(
      createContactToCoilProject({ contactType: 'NO_CONTACT', inputValue: false }),
      100,
    )

    expect(getVariable(result.project, 'output').value).toBe(false)
    expect(result.state.activeElementIds).not.toContain('contact')
  })

  it('passes FALSE through NC_CONTACT', () => {
    const result = simulateProjectWithState(
      createContactToCoilProject({ contactType: 'NC_CONTACT', inputValue: false }),
      100,
    )

    expect(getVariable(result.project, 'output').value).toBe(true)
  })

  it('blocks TRUE through NC_CONTACT', () => {
    const result = simulateProjectWithState(
      createContactToCoilProject({ contactType: 'NC_CONTACT', inputValue: true }),
      100,
    )

    expect(getVariable(result.project, 'output').value).toBe(false)
  })

  it('does not power an element without LEFT_RAIL connection', () => {
    const input = createBoolVariable({ id: 'input', value: true })
    const output = createBoolVariable({ id: 'output', address: '%Q0.0' })
    const contact = createElement({ id: 'contact', variableId: input.id })
    const coil = createElement({
      id: 'coil',
      type: 'COIL',
      variableId: output.id,
    })
    const project = createProject({
      variables: [input, output],
      rungs: [
        createRung({
          elements: [contact, coil],
          connections: [connect(contact.id, coil.id), connectRight(coil.id)],
        }),
      ],
    })

    const result = simulateProjectWithState(project, 100)

    expect(getVariable(result.project, 'output').value).toBe(false)
  })

  it('marks RIGHT_RAIL connection active when the path is TRUE', () => {
    const input = createBoolVariable({ id: 'input', value: true })
    const output = createBoolVariable({ id: 'output', address: '%Q0.0' })
    const contact = createElement({ id: 'contact', variableId: input.id })
    const coil = createElement({
      id: 'coil',
      type: 'COIL',
      variableId: output.id,
    })
    const rightConnection = connectRight(coil.id)
    const project = createProject({
      variables: [input, output],
      rungs: [
        createRung({
          elements: [contact, coil],
          connections: [
            connectLeft(contact.id),
            connect(contact.id, coil.id),
            rightConnection,
          ],
        }),
      ],
    })

    const result = simulateProjectWithState(project, 100)

    expect(result.state.activeConnectionIds).toContain(rightConnection.id)
  })

  it('uses OR semantics for multiple incoming branches', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start', value: true })
    const sensor = createBoolVariable({
      id: 'sensor',
      name: 'Sensor',
      value: false,
    })
    const motor = createBoolVariable({
      id: 'motor',
      name: 'Motor',
      address: '%Q0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      variableId: start.id,
    })
    const sensorContact = createElement({
      id: 'sensor-contact',
      variableId: sensor.id,
    })
    const coil = createElement({
      id: 'motor-coil',
      type: 'COIL',
      variableId: motor.id,
    })
    const project = createProject({
      variables: [start, sensor, motor],
      rungs: [
        createRung({
          elements: [startContact, sensorContact, coil],
          connections: [
            connectLeft(startContact.id),
            connectLeft(sensorContact.id),
            connect(startContact.id, coil.id),
            connect(sensorContact.id, coil.id),
            connectRight(coil.id),
          ],
        }),
      ],
    })

    expect(getVariable(simulateProjectWithState(project, 100).project, 'motor').value).toBe(true)

    const bothFalseProject = {
      ...project,
      variables: project.variables.map((variable) =>
        variable.type === 'BOOL' ? { ...variable, value: false } : variable,
      ),
    }

    expect(
      getVariable(simulateProjectWithState(bothFalseProject, 100).project, 'motor').value,
    ).toBe(false)
  })

  it('runs TON timing and resets on falling input', () => {
    const timer = createTimerVariable({
      id: 'timer',
      name: 'Timer1',
      presetMs: 300,
    })
    let project = createBlockToCoilProject('TON', timer, false)
    let result = simulateProjectWithState(project, 100)

    expect(getVariable(result.project, 'timer').elapsedMs).toBe(0)
    expect(getVariable(result.project, 'timer').done).toBe(false)

    project = {
      ...result.project,
      variables: result.project.variables.map((variable) =>
        variable.id === 'input' ? { ...variable, value: true } : variable,
      ),
    }
    result = simulateProjectWithState(project, 100)
    expect(getVariable(result.project, 'timer').elapsedMs).toBe(100)
    expect(getVariable(result.project, 'timer').done).toBe(false)

    result = simulateProjectWithState(result.project, 200)
    expect(getVariable(result.project, 'timer').done).toBe(true)
    expect(getVariable(result.project, 'output').value).toBe(true)

    project = {
      ...result.project,
      variables: result.project.variables.map((variable) =>
        variable.id === 'input' ? { ...variable, value: false } : variable,
      ),
    }
    result = simulateProjectWithState(project, 100)
    expect(getVariable(result.project, 'timer').elapsedMs).toBe(0)
    expect(getVariable(result.project, 'timer').done).toBe(false)
  })

  it('does not advance the same TON more than once in one scan', () => {
    const timer = createTimerVariable({ id: 'timer', presetMs: 500 })
    const project = createBlockToCoilProject('TON', timer, true)
    const timerElement = project.rungs[0].elements.find(
      (element) => element.id === 'block',
    )

    if (!timerElement) {
      throw new Error('Missing timer element')
    }

    const projectWithTimerRightRail = {
      ...project,
      rungs: [
        {
          ...project.rungs[0],
          connections: [
            ...project.rungs[0].connections,
            connectRight(timerElement.id),
          ],
        },
      ],
    }
    const result = simulateProjectWithState(projectWithTimerRightRail, 100)

    expect(getVariable(result.project, 'timer').elapsedMs).toBe(100)
  })

  it('runs TOF off delay', () => {
    const timer = createTimerVariable({ id: 'timer', presetMs: 300 })
    let project = createBlockToCoilProject('TOF', timer, true)
    let result = simulateProjectWithState(project, 100)

    expect(getVariable(result.project, 'timer').done).toBe(true)

    project = {
      ...result.project,
      variables: result.project.variables.map((variable) =>
        variable.id === 'input' ? { ...variable, value: false } : variable,
      ),
    }
    result = simulateProjectWithState(project, 100)
    expect(getVariable(result.project, 'timer').done).toBe(true)

    result = simulateProjectWithState(result.project, 200)
    expect(getVariable(result.project, 'timer').done).toBe(false)
  })

  it('runs TP pulse only on rising edge', () => {
    const timer = createTimerVariable({ id: 'timer', presetMs: 300 })
    let result = simulateProjectWithState(
      createBlockToCoilProject('TP', timer, true),
      100,
    )

    expect(getVariable(result.project, 'timer').done).toBe(true)
    result = simulateProjectWithState(result.project, 200)
    expect(getVariable(result.project, 'timer').done).toBe(false)
    result = simulateProjectWithState(result.project, 100)
    expect(getVariable(result.project, 'timer').done).toBe(false)
  })

  it('counts CTU rising edges and sets done at preset', () => {
    const counter = createCounterVariable({ id: 'counter', preset: 2 })
    let result = simulateProjectWithState(
      createBlockToCoilProject('CTU', counter, true),
      100,
    )

    expect(getVariable(result.project, 'counter').count).toBe(1)
    expect(getVariable(result.project, 'counter').done).toBe(false)

    result = simulateProjectWithState(result.project, 100)
    expect(getVariable(result.project, 'counter').count).toBe(1)

    let project = {
      ...result.project,
      variables: result.project.variables.map((variable) =>
        variable.id === 'input' ? { ...variable, value: false } : variable,
      ),
    }
    result = simulateProjectWithState(project, 100)
    project = {
      ...result.project,
      variables: result.project.variables.map((variable) =>
        variable.id === 'input' ? { ...variable, value: true } : variable,
      ),
    }
    result = simulateProjectWithState(project, 100)

    expect(getVariable(result.project, 'counter').count).toBe(2)
    expect(getVariable(result.project, 'counter').done).toBe(true)
  })

  it('counts CTD down on rising edge and sets done at zero', () => {
    const counter = createCounterVariable({
      id: 'counter',
      preset: 3,
      count: 1,
    })
    const result = simulateProjectWithState(
      createBlockToCoilProject('CTD', counter, true),
      100,
    )

    expect(getVariable(result.project, 'counter').count).toBe(0)
    expect(getVariable(result.project, 'counter').done).toBe(true)
  })

  it('sets and resets BOOL latch coils only when input is TRUE', () => {
    const marker = createBoolVariable({
      id: 'marker',
      name: 'Marker',
      address: '%M0.0',
      value: false,
    })
    let result = simulateProjectWithState(
      createBlockToCoilProject('SET_COIL', marker, true),
      100,
    )

    expect(getVariable(result.project, 'marker').value).toBe(true)

    result = simulateProjectWithState(
      createBlockToCoilProject('RESET_COIL', {
        ...marker,
        value: true,
      }, true),
      100,
    )
    expect(getVariable(result.project, 'marker').value).toBe(false)

    result = simulateProjectWithState(
      createBlockToCoilProject('RESET_COIL', {
        ...marker,
        value: true,
      }, false),
      100,
    )
    expect(getVariable(result.project, 'marker').value).toBe(true)
  })
})
