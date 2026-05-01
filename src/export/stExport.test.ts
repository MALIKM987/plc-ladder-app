import { describe, expect, it } from 'vitest'
import { exportProjectToStructuredText } from './stExport'
import {
  connect,
  connectLeft,
  connectRight,
  createBoolVariable,
  createElement,
  createProject,
  createRung,
  createTimerVariable,
} from '../test/builders'

describe('exportProjectToStructuredText', () => {
  it('adds release header, timestamp, and variable comments', () => {
    const start = createBoolVariable({
      id: 'start',
      name: 'Start',
      address: '%I0.0',
    })
    const project = createProject({
      name: 'Release Demo',
      variables: [start],
      rungs: [],
    })
    const st = exportProjectToStructuredText(project)

    expect(st).toContain('PLC Ladder Studio Structured Text export')
    expect(st).toContain('Project: Release Demo')
    expect(st).toContain('Generated:')
    expect(st).toContain('BOOL Start AT %I0.0')
  })

  it('exports Start -> Motor as assignment', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start', value: true })
    const motor = createBoolVariable({
      id: 'motor',
      name: 'Motor',
      address: '%Q0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const motorCoil = createElement({
      id: 'motor-coil',
      type: 'COIL',
      variableId: motor.id,
    })
    const project = createProject({
      variables: [start, motor],
      rungs: [
        createRung({
          elements: [startContact, motorCoil],
          connections: [
            connectLeft(startContact.id),
            connect(startContact.id, motorCoil.id),
            connectRight(motorCoil.id),
          ],
        }),
      ],
    })

    expect(exportProjectToStructuredText(project)).toContain('Motor := Start;')
  })

  it('exports Start -> TON -> Motor', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start' })
    const timer = createTimerVariable({
      id: 'timer',
      name: 'Timer1',
      presetMs: 1000,
    })
    const motor = createBoolVariable({
      id: 'motor',
      name: 'Motor',
      address: '%Q0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const ton = createElement({
      id: 'ton',
      type: 'TON',
      variableId: timer.id,
    })
    const motorCoil = createElement({
      id: 'motor-coil',
      type: 'COIL',
      variableId: motor.id,
    })
    const project = createProject({
      variables: [start, timer, motor],
      rungs: [
        createRung({
          elements: [startContact, ton, motorCoil],
          connections: [
            connectLeft(startContact.id),
            connect(startContact.id, ton.id),
            connect(ton.id, motorCoil.id),
            connectRight(motorCoil.id),
          ],
        }),
      ],
    })
    const st = exportProjectToStructuredText(project)

    expect(st).toContain('Timer1(IN := Start, PT := T#1000ms);')
    expect(st).toContain('Motor := Timer1.Q;')
  })

  it('exports OR branches', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start' })
    const sensor = createBoolVariable({ id: 'sensor', name: 'Sensor_1' })
    const motor = createBoolVariable({
      id: 'motor',
      name: 'Motor',
      address: '%Q0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const sensorContact = createElement({
      id: 'sensor-contact',
      type: 'NO_CONTACT',
      variableId: sensor.id,
    })
    const motorCoil = createElement({
      id: 'motor-coil',
      type: 'COIL',
      variableId: motor.id,
    })
    const project = createProject({
      variables: [start, sensor, motor],
      rungs: [
        createRung({
          elements: [startContact, sensorContact, motorCoil],
          connections: [
            connectLeft(startContact.id),
            connectLeft(sensorContact.id),
            connect(startContact.id, motorCoil.id),
            connect(sensorContact.id, motorCoil.id),
            connectRight(motorCoil.id),
          ],
        }),
      ],
    })

    expect(exportProjectToStructuredText(project)).toContain(
      'Motor := Start OR Sensor_1;',
    )
  })

  it('exports SET and RESET coils', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start' })
    const marker = createBoolVariable({
      id: 'marker',
      name: 'Marker',
      address: '%M0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const setCoil = createElement({
      id: 'set-coil',
      type: 'SET_COIL',
      variableId: marker.id,
    })
    const resetCoil = createElement({
      id: 'reset-coil',
      type: 'RESET_COIL',
      variableId: marker.id,
    })
    const project = createProject({
      variables: [start, marker],
      rungs: [
        createRung({
          elements: [startContact, setCoil, resetCoil],
          connections: [
            connectLeft(startContact.id),
            connect(startContact.id, setCoil.id),
            connectRight(setCoil.id),
            connect(startContact.id, resetCoil.id),
            connectRight(resetCoil.id),
          ],
        }),
      ],
    })
    const st = exportProjectToStructuredText(project)

    expect(st).toContain('IF Start THEN Marker := TRUE; END_IF;')
    expect(st).toContain('IF Start THEN Marker := FALSE; END_IF;')
  })

  it('sanitizes variable names', () => {
    const start = createBoolVariable({ id: 'start', name: 'Start Signal' })
    const motor = createBoolVariable({
      id: 'motor',
      name: '1-Motor',
      address: '%Q0.0',
    })
    const startContact = createElement({
      id: 'start-contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const motorCoil = createElement({
      id: 'motor-coil',
      type: 'COIL',
      variableId: motor.id,
    })
    const project = createProject({
      variables: [start, motor],
      rungs: [
        createRung({
          elements: [startContact, motorCoil],
          connections: [
            connectLeft(startContact.id),
            connect(startContact.id, motorCoil.id),
            connectRight(motorCoil.id),
          ],
        }),
      ],
    })

    expect(exportProjectToStructuredText(project)).toContain(
      '_1_Motor := Start_Signal;',
    )
  })
})
