import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type { Project } from '../types/project'

export const demoProject: Project = {
  id: 'demo-project-v2',
  name: 'Demo PLC Ladder v2',
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
      id: 'demo-var-sensor',
      name: 'Sensor',
      address: '%I0.1',
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
      id: 'demo-rung-ton',
      number: 1,
      title: 'Start timer motor',
      comment: 'Start -> TON -> Motor',
      breakpoint: false,
      elements: [
        {
          id: 'demo-element-start',
          type: 'NO_CONTACT',
          variableId: 'demo-var-start',
          position: { x: 120, y: 70 },
        },
        {
          id: 'demo-element-ton',
          type: 'TON',
          variableId: 'demo-var-timer',
          position: { x: 320, y: 70 },
        },
        {
          id: 'demo-element-motor',
          type: 'COIL',
          variableId: 'demo-var-motor',
          position: { x: 560, y: 70 },
        },
      ],
      connections: [
        {
          id: 'demo-connection-left-start',
          fromElementId: LEFT_RAIL_ID,
          toElementId: 'demo-element-start',
        },
        {
          id: 'demo-connection-start-ton',
          fromElementId: 'demo-element-start',
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
      id: 'demo-rung-counter',
      number: 2,
      title: 'Sensor counter marker',
      comment: 'Sensor -> CTU -> Marker',
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
          id: 'demo-element-marker',
          type: 'COIL',
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
          id: 'demo-connection-ctu-marker',
          fromElementId: 'demo-element-ctu',
          toElementId: 'demo-element-marker',
        },
        {
          id: 'demo-connection-marker-right',
          fromElementId: 'demo-element-marker',
          toElementId: RIGHT_RAIL_ID,
        },
      ],
    },
  ],
}
