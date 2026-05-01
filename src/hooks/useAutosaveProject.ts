import { useCallback, useEffect, useMemo, useState } from 'react'
import { migrateProject } from '../project/migrateProject'
import type { Project } from '../types/project'

export const AUTOSAVE_STORAGE_KEY = 'plc-ladder-autosave-project'
const DEFAULT_AUTOSAVE_DELAY_MS = 500

function readProjectFromStorage() {
  const serializedProject = localStorage.getItem(AUTOSAVE_STORAGE_KEY)

  if (!serializedProject?.trim()) {
    return null
  }

  try {
    return migrateProject(JSON.parse(serializedProject))
  } catch {
    return null
  }
}

export function clearAutosavedProject() {
  localStorage.removeItem(AUTOSAVE_STORAGE_KEY)
}

export function useAutosaveProject(
  project: Project,
  delayMs = DEFAULT_AUTOSAVE_DELAY_MS,
) {
  const initialAutosave = useMemo(() => readProjectFromStorage(), [])
  const [pendingAutosave, setPendingAutosave] =
    useState<Project | null>(initialAutosave)
  const [autosaveChoiceHandled, setAutosaveChoiceHandled] = useState(
    () => initialAutosave === null,
  )

  useEffect(() => {
    if (!autosaveChoiceHandled) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(project))
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [autosaveChoiceHandled, delayMs, project])

  const markAutosaveHandled = useCallback(() => {
    setAutosaveChoiceHandled(true)
    setPendingAutosave(null)
  }, [])

  const discardAutosave = useCallback(() => {
    clearAutosavedProject()
    markAutosaveHandled()
  }, [markAutosaveHandled])

  return {
    autosavedProject: autosaveChoiceHandled ? null : pendingAutosave,
    discardAutosave,
    markAutosaveHandled,
  }
}
