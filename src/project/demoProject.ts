import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type { Project } from '../types/project'

export const demoProject: Project = {
  id: 'demo-project-rc1',
  name: 'PLC Ladder Studio Demo',
  version: '2.0.0',
  variables: [
    {
      id: 'demo-var-start',
      name: 'Start',
      address: '%I0.0',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'demo-var-stop',
      name: 'Stop',
      address: '%I0.1',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'demo-var-sensor',
      name: 'Sensor',
      address: '%I0.2',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'demo-var-reset',
      name: 'Reset',
      address: '%I0.3',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'demo-var-timer',
      name: 'Timer1',
      address: '%T1',
      type: 'TIMER',
      value: false,
      presetMs: 1000,
      elapsedMs: 0,
      done: false,
      previousInput: false,
    },
    {
      id: 'demo-var-counter',
      name: 'Counter1',
      address: '%C1',
      type: 'COUNTER',
      value: false,
      preset: 3,
      count: 0,
      done: false,
      previousInput: false,
    },
    {
      id: 'demo-var-motor',
      name: 'Motor',
      address: '%Q0.0',
      type: 'BOOL',
      value: false,
    },
    {
      id: 'demo-var-marker',
      name: 'Marker',
      address: '%M0.0',
      type: 'BOOL',
      value: false,
    },
  ],
  rungs: [
    {
      id: 'demo-rung-motor-start',
      number: 1,
      title: 'Start/Stop Motor',
      comment:
        'Start uruchamia timer TON. Styk Stop jest NC, więc Stop=TRUE blokuje start.',
      breakpoint: false,
      elements: [
        {
          id: 'demo-element-start',
          type: 'NO_CONTACT',
          variableId: 'demo-var-start',
          position: { x: 120, y: 70 },
        },
        {
          id: 'demo-element-stop',
          type: 'NC_CONTACT',
          variableId: 'demo-var-stop',
          position: { x: 280, y: 70 },
        },
        {
          id: 'demo-element-ton',
          type: 'TON',
          variableId: 'demo-var-timer',
          position: { x: 460, y: 70 },
        },
        {
          id: 'demo-element-motor',
          type: 'COIL',
          variableId: 'demo-var-motor',
          position: { x: 660, y: 70 },
        },
      ],
      connections: [
        {
          id: 'demo-connection-left-start',
          fromElementId: LEFT_RAIL_ID,
          toElementId: 'demo-element-start',
        },
        {
          id: 'demo-connection-start-stop',
          fromElementId: 'demo-element-start',
          toElementId: 'demo-element-stop',
        },
        {
          id: 'demo-connection-stop-ton',
          fromElementId: 'demo-element-stop',
          toElementId: 'demo-element-ton',
        },
        {
          id: 'demo-connection-ton-motor',
          fromElementId: 'demo-element-ton',
          toElementId: 'demo-element-motor',
        },
        {
          id: 'demo-connection-motor-right',
          fromElementId: 'demo-element-motor',
          toElementId: RIGHT_RAIL_ID,
        },
      ],
    },
    {
      id: 'demo-rung-counter-set',
      number: 2,
      title: 'Sensor Counter',
      comment:
        'Każde zbocze narastające Sensor zwiększa CTU. Po PV=3 licznik ustawia Marker.',
      breakpoint: false,
      elements: [
        {
          id: 'demo-element-sensor',
          type: 'NO_CONTACT',
          variableId: 'demo-var-sensor',
          position: { x: 120, y: 70 },
        },
        {
          id: 'demo-element-ctu',
          type: 'CTU',
          variableId: 'demo-var-counter',
          position: { x: 320, y: 70 },
        },
        {
          id: 'demo-element-set-marker',
          type: 'SET_COIL',
          variableId: 'demo-var-marker',
          position: { x: 560, y: 70 },
        },
      ],
      connections: [
        {
          id: 'demo-connection-left-sensor',
          fromElementId: LEFT_RAIL_ID,
          toElementId: 'demo-element-sensor',
        },
        {
          id: 'demo-connection-sensor-ctu',
          fromElementId: 'demo-element-sensor',
          toElementId: 'demo-element-ctu',
        },
        {
          id: 'demo-connection-ctu-set-marker',
          fromElementId: 'demo-element-ctu',
          toElementId: 'demo-element-set-marker',
        },
        {
          id: 'demo-connection-set-marker-right',
          fromElementId: 'demo-element-set-marker',
          toElementId: RIGHT_RAIL_ID,
        },
      ],
    },
    {
      id: 'demo-rung-reset-marker',
      number: 3,
      title: 'Reset Marker',
      comment: 'Wejście Reset kasuje zatrzaśnięty Marker.',
      breakpoint: false,
      elements: [
        {
          id: 'demo-element-reset',
          type: 'NO_CONTACT',
          variableId: 'demo-var-reset',
          position: { x: 120, y: 70 },
        },
        {
          id: 'demo-element-reset-marker',
          type: 'RESET_COIL',
          variableId: 'demo-var-marker',
          position: { x: 420, y: 70 },
        },
      ],
      connections: [
        {
          id: 'demo-connection-left-reset',
          fromElementId: LEFT_RAIL_ID,
          toElementId: 'demo-element-reset',
        },
        {
          id: 'demo-connection-reset-reset-marker',
          fromElementId: 'demo-element-reset',
          toElementId: 'demo-element-reset-marker',
        },
        {
          id: 'demo-connection-reset-marker-right',
          fromElementId: 'demo-element-reset-marker',
          toElementId: RIGHT_RAIL_ID,
        },
      ],
    },
  ],
}
