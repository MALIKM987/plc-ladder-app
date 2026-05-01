/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addElement, addRung } from '../project/projectActions'
import {
  createBoolVariable,
  createProject,
  createRung,
} from '../test/builders'
import { useProjectHistory } from './useProjectHistory'

function createHistoryProject() {
  return createProject({
    variables: [createBoolVariable({ id: 'start', name: 'Start' })],
    rungs: [createRung({ id: 'rung', elements: [], connections: [] })],
  })
}

describe('useProjectHistory', () => {
  it('undo removes an added element and redo restores it', () => {
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
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())

    expect(result.current.project.rungs[0].elements).toHaveLength(0)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())

    expect(result.current.project.rungs[0].elements).toHaveLength(1)
  })

  it('clears future after a new action following undo', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProject((project) =>
        addElement(project, 'rung', 'NO_CONTACT', {
          id: 'first-contact',
          autoConnect: false,
        }),
      )
    })
    act(() => result.current.undo())
    act(() => {
      result.current.setProject((project) =>
        addElement(project, 'rung', 'NC_CONTACT', {
          id: 'second-contact',
          autoConnect: false,
        }),
      )
    })

    expect(result.current.canRedo).toBe(false)
    expect(result.current.project.rungs[0].elements[0].type).toBe('NC_CONTACT')
  })

  it('limits stored history', () => {
    const { result } = renderHook(() =>
      useProjectHistory(createProject({ rungs: [] }), 3),
    )

    for (let index = 0; index < 5; index += 1) {
      act(() => {
        result.current.setProject((project) => addRung(project))
      })
    }

    expect(result.current.project.rungs).toHaveLength(5)

    for (let index = 0; index < 4; index += 1) {
      act(() => result.current.undo())
    }

    expect(result.current.project.rungs).toHaveLength(2)
    expect(result.current.canUndo).toBe(false)
  })

  it('updates without history for runtime changes', () => {
    const { result } = renderHook(() => useProjectHistory(createHistoryProject()))

    act(() => {
      result.current.setProjectWithoutHistory((project) => ({
        ...project,
        name: 'Runtime update',
      }))
    })

    expect(result.current.project.name).toBe('Runtime update')
    expect(result.current.canUndo).toBe(false)
  })
})
