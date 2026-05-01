import { describe, expect, it } from 'vitest'
import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import { migrateProject } from './migrateProject'

describe('migrateProject', () => {
  it('fills missing Project fields from a partial object', () => {
    const project = migrateProject({})

    expect(project.id).toBe('project')
    expect(project.name).toBe('PLC Ladder Project')
    expect(project.version).toBe('2.0.0')
    expect(project.variables).toEqual([])
    expect(project.rungs).toEqual([])
  })

  it('adds rail connections to old rungs without rail endpoints', () => {
    const project = migrateProject({
      variables: [
        { id: 'start', name: 'Start', address: '%I0.0', type: 'BOOL' },
        { id: 'motor', name: 'Motor', address: '%Q0.0', type: 'BOOL' },
      ],
      rungs: [
        {
          id: 'rung-1',
          number: 4,
          elements: [
            {
              id: 'contact',
              type: 'NO_CONTACT',
              variableId: 'start',
              position: { x: 120, y: 70 },
            },
            {
              id: 'coil',
              type: 'COIL',
              variableId: 'motor',
              position: { x: 320, y: 70 },
            },
          ],
          connections: [
            {
              id: 'old-connection',
              fromElementId: 'contact',
              toElementId: 'coil',
            },
          ],
        },
      ],
    })

    expect(project.rungs[0].number).toBe(1)
    expect(project.rungs[0].connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromElementId: LEFT_RAIL_ID,
          toElementId: 'contact',
        }),
        expect.objectContaining({
          fromElementId: 'coil',
          toElementId: RIGHT_RAIL_ID,
        }),
      ]),
    )
  })

  it('fills TIMER runtime defaults', () => {
    const project = migrateProject({
      variables: [{ id: 'timer', name: 'Timer1', address: '%T1', type: 'TIMER' }],
    })
    const timer = project.variables[0]

    expect(timer.presetMs).toBe(1000)
    expect(timer.elapsedMs).toBe(0)
    expect(timer.done).toBe(false)
    expect(timer.previousInput).toBe(false)
  })

  it('fills COUNTER runtime defaults', () => {
    const project = migrateProject({
      variables: [
        { id: 'counter', name: 'Counter1', address: '%C1', type: 'COUNTER' },
      ],
    })
    const counter = project.variables[0]

    expect(counter.preset).toBe(3)
    expect(counter.count).toBe(0)
    expect(counter.done).toBe(false)
    expect(counter.previousInput).toBe(false)
  })

  it('uses safe defaults for invalid element and variable types', () => {
    const project = migrateProject({
      variables: [
        {
          id: 'bad-var',
          name: 'BadVar',
          address: '%X1',
          type: 'UNKNOWN',
        },
      ],
      rungs: [
        {
          elements: [
            {
              id: 'bad-element',
              type: 'UNKNOWN_ELEMENT',
              variableId: 'bad-var',
            },
          ],
        },
      ],
    })

    expect(project.variables[0].type).toBe('BOOL')
    expect(project.rungs[0].elements[0].type).toBe('NO_CONTACT')
  })

  it('does not throw for invalid raw input', () => {
    expect(() => migrateProject(null)).not.toThrow()
    expect(() => migrateProject('not a project')).not.toThrow()
    expect(migrateProject(null).rungs).toEqual([])
  })
})
