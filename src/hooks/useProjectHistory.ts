import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react'
import type { Project } from '../types/project'

export type ProjectHistory = {
  past: Project[]
  present: Project
  future: Project[]
}

const DEFAULT_HISTORY_LIMIT = 50

function resolveProjectUpdate(
  update: SetStateAction<Project>,
  currentProject: Project,
) {
  return typeof update === 'function'
    ? (update as (project: Project) => Project)(currentProject)
    : update
}

function limitPast(past: Project[], limit: number) {
  return past.slice(Math.max(0, past.length - limit))
}

export function useProjectHistory(
  initialProject: Project | (() => Project),
  historyLimit = DEFAULT_HISTORY_LIMIT,
) {
  const [history, setHistory] = useState<ProjectHistory>(() => ({
    past: [],
    present:
      typeof initialProject === 'function' ? initialProject() : initialProject,
    future: [],
  }))

  const setProject: Dispatch<SetStateAction<Project>> = useCallback(
    (update) => {
      setHistory((currentHistory) => {
        const nextProject = resolveProjectUpdate(
          update,
          currentHistory.present,
        )

        if (nextProject === currentHistory.present) {
          return currentHistory
        }

        return {
          past: limitPast(
            [...currentHistory.past, currentHistory.present],
            historyLimit,
          ),
          present: nextProject,
          future: [],
        }
      })
    },
    [historyLimit],
  )

  const setProjectWithoutHistory: Dispatch<SetStateAction<Project>> =
    useCallback((update) => {
      setHistory((currentHistory) => ({
        ...currentHistory,
        present: resolveProjectUpdate(update, currentHistory.present),
      }))
    }, [])

  const resetHistory = useCallback((nextProject?: Project) => {
    setHistory((currentHistory) => ({
      past: [],
      present: nextProject ?? currentHistory.present,
      future: [],
    }))
  }, [])

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const previousProject =
        currentHistory.past[currentHistory.past.length - 1]

      if (!previousProject) {
        return currentHistory
      }

      return {
        past: currentHistory.past.slice(0, -1),
        present: previousProject,
        future: [currentHistory.present, ...currentHistory.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const nextProject = currentHistory.future[0]

      if (!nextProject) {
        return currentHistory
      }

      return {
        past: limitPast(
          [...currentHistory.past, currentHistory.present],
          historyLimit,
        ),
        present: nextProject,
        future: currentHistory.future.slice(1),
      }
    })
  }, [historyLimit])

  return useMemo(
    () => ({
      project: history.present,
      setProject,
      setProjectWithoutHistory,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      resetHistory,
    }),
    [
      history.future.length,
      history.past.length,
      history.present,
      redo,
      resetHistory,
      setProject,
      setProjectWithoutHistory,
      undo,
    ],
  )
}
