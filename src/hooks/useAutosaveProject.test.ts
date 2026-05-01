/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../test/builders'
import {
  AUTOSAVE_STORAGE_KEY,
  useAutosaveProject,
} from './useAutosaveProject'

describe('useAutosaveProject', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('saves the Project model to localStorage with debounce', () => {
    const project = createProject({ name: 'Fresh project' })

    renderHook(() => useAutosaveProject(project, 500))

    act(() => vi.advanceTimersByTime(499))
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toContain(
      'Fresh project',
    )
  })

  it('does not overwrite an existing autosave before the user chooses', () => {
    const savedProject = createProject({ name: 'Saved project' })
    const currentProject = createProject({ name: 'Current project' })

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(savedProject))

    const { result } = renderHook(() =>
      useAutosaveProject(currentProject, 500),
    )

    expect(result.current.autosavedProject?.name).toBe('Saved project')

    act(() => vi.advanceTimersByTime(500))
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toContain(
      'Saved project',
    )

    act(() => result.current.markAutosaveHandled())
    act(() => vi.advanceTimersByTime(500))

    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toContain(
      'Current project',
    )
  })

  it('can discard an existing autosave', () => {
    localStorage.setItem(
      AUTOSAVE_STORAGE_KEY,
      JSON.stringify(createProject({ name: 'Saved project' })),
    )

    const { result } = renderHook(() =>
      useAutosaveProject(createProject({ name: 'Current project' }), 500),
    )

    act(() => result.current.discardAutosave())

    expect(result.current.autosavedProject).toBeNull()
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()
  })
})
