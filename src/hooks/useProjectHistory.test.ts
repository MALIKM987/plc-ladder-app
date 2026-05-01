/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addElement } from '../project/projectActions'
import {
  createBoolVariable,
  createProject,
  createRung,
} from '../test/builders'
import { useProjectHistory } from './useProjectHistory'

function createHistoryProject(name = 'Base project') {
  return createProject({
    name,
    variables: [createBoolVariable({ id: 'start', name: 'Start' })],
    rungs: [createRung({ id: 'rung', elements: [], connections: [] })],
  })
}

describe('useProjectHistory', () => {
  it('setProject adds the previous state to history', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProject((project) => ({
        ...project,
        name: 'Edited project',
      }))
    })

    expect(result.current.project.name).toBe('Edited project')
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())

    expect(result.current.project.name).toBe('Base project')
  })

  it('undo reverts a change and redo restores it', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProject((project) =>
        addElement(project, 'rung', 'NO_CONTACT', {
          id: 'contact',
          autoConnect: false,
        }),
      )
    })

    expect(result.current.project.rungs[0].elements).toHaveLength(1)

    act(() => result.current.undo())

    expect(result.current.project.rungs[0].elements).toHaveLength(0)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())

    expect(result.current.project.rungs[0].elements).toHaveLength(1)
  })

  it('clears future after a new action following undo', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProject((project) => ({
        ...project,
        name: 'First edit',
      }))
    })
    act(() => result.current.undo())
    act(() => {
      result.current.setProject((project) => ({
        ...project,
        name: 'Second edit',
      }))
    })

    expect(result.current.project.name).toBe('Second edit')
    expect(result.current.canRedo).toBe(false)
  })

  it('limits history to 50 states by default', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    for (let index = 0; index < 55; index += 1) {
      act(() => {
        result.current.setProject((project) => ({
          ...project,
          name: `state-${index}`,
        }))
      })
    }

    for (let index = 0; index < 50; index += 1) {
      act(() => result.current.undo())
    }

    expect(result.current.project.name).toBe('state-4')
    expect(result.current.canUndo).toBe(false)
  })

  it('setProjectWithoutHistory updates present without adding undo history', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProjectWithoutHistory((project) => ({
        ...project,
        name: 'Runtime scan update',
      }))
    })

    expect(result.current.project.name).toBe('Runtime scan update')
    expect(result.current.canUndo).toBe(false)
  })

  it('resetHistory replaces present and clears past and future', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProject((project) => ({
        ...project,
        name: 'Edited project',
      }))
    })
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.resetHistory(createHistoryProject('Reset project')))

    expect(result.current.project.name).toBe('Reset project')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
