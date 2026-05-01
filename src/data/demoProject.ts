import type { Project } from '../types/project'

export const demoProject: Project = {
  id: 'demo-project',
  name: 'Demo PLC Ladder',
  version: '1.0.0',
  variables: [
    {
      id: 'var-start',
      name: 'Start',
      address: '%I0.0',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-stop',
      name: 'Stop',
      address: '%I0.1',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-motor',
      name: 'Motor',
      address: '%Q0.0',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-alarm',
      name: 'Alarm',
      address: '%Q0.1',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-sensor-1',
      name: 'Sensor_1',
      address: '%I0.2',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-valve-a',
      name: 'Valve_A',
      address: '%Q0.2',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'var-timer-1',
      name: 'Timer1',
      address: '%T1',
      type: 'TIMER',
      value: false,
      presetMs: 1000,
      elapsedMs: 0,
      done: false,
    },
    {
      id: 'var-counter-1',
      name: 'Counter1',
      address: '%C1',
      type: 'COUNTER',
      value: false,
      preset: 3,
      count: 0,
      done: false,
      previousInput: false,
    },
  ],
  rungs: [
    {
      id: 'rung-1',
      number: 1,
      elements: [
        {
          id: 'element-start-contact',
          type: 'NO_CONTACT',
          variableId: 'var-start',
          position: { x: 120, y: 0 },
        },
        {
          id: 'element-motor-coil',
          type: 'COIL',
          variableId: 'var-motor',
          position: { x: 420, y: 0 },
        },
      ],
      connections: [
        {
          id: 'connection-start-motor',
          fromElementId: 'element-start-contact',
          toElementId: 'element-motor-coil',
        },
      ],
    },
    {
      id: 'rung-2',
      number: 2,
      elements: [
        {
          id: 'element-stop-contact',
          type: 'NO_CONTACT',
          variableId: 'var-stop',
          position: { x: 120, y: 0 },
        },
        {
          id: 'element-alarm-coil',
          type: 'COIL',
          variableId: 'var-alarm',
          position: { x: 420, y: 0 },
        },
      ],
      connections: [
        {
          id: 'connection-stop-alarm',
          fromElementId: 'element-stop-contact',
          toElementId: 'element-alarm-coil',
        },
      ],
    },
    {
      id: 'rung-3',
      number: 3,
      elements: [
        {
          id: 'element-sensor-1-contact',
          type: 'NO_CONTACT',
          variableId: 'var-sensor-1',
          position: { x: 120, y: 0 },
        },
        {
          id: 'element-valve-a-coil',
          type: 'COIL',
          variableId: 'var-valve-a',
          position: { x: 420, y: 0 },
        },
      ],
      connections: [
        {
          id: 'connection-sensor-1-valve-a',
          fromElementId: 'element-sensor-1-contact',
          toElementId: 'element-valve-a-coil',
        },
      ],
    },
  ],
}
