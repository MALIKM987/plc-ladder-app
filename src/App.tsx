import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { BlockLibrary } from './components/BlockLibrary'
import { BottomPanel } from './components/BottomPanel'
import { LadderEditor } from './components/LadderEditor'
import { SimulationPanel } from './components/SimulationPanel'
import { TopBar } from './components/TopBar'
import { demoProject } from './data/demoProject'
import { exportProjectToStructuredText } from './export/stExport'
import type { Language } from './i18n/translations'
import { useTranslation } from './i18n/useTranslation'
import { migrateProject } from './project/migrateProject'
import { resetSimulationProject } from './project/projectActions'
import { simulateProjectWithState } from './simulator/simulate'
import type { SimulationState } from './simulator/simulationState'
import type { Project } from './types/project'
import './App.css'

type SimulationStatus = 'RUN' | 'STOP'
type Theme = 'light' | 'dark'

const SCAN_INTERVAL_MS = 200
const THEME_STORAGE_KEY = 'plc-ladder-theme'
const LANGUAGE_STORAGE_KEY = 'plc-ladder-language'
const DEBUG_STORAGE_KEY = 'plc-ladder-show-debug'
const HISTORY_LIMIT = 60

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function App() {
  const [project, setProjectState] = useState<Project>(() =>
    migrateProject(demoProject),
  )
  const [undoStack, setUndoStack] = useState<Project[]>([])
  const [redoStack, setRedoStack] = useState<Project[]>([])
  const [simulationStatus, setSimulationStatus] =
    useState<SimulationStatus>('STOP')
  const [simulationState, setSimulationState] =
    useState<SimulationState | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light',
  )
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'pl',
  )
  const [showDebug, setShowDebug] = useState(
    () => localStorage.getItem(DEBUG_STORAGE_KEY) === 'true',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectRef = useRef(project)
  const { t } = useTranslation(language)

  useEffect(() => {
    projectRef.current = project
  }, [project])

  const setProjectWithHistory: Dispatch<SetStateAction<Project>> =
    useCallback((update) => {
      setProjectState((currentProject) => {
        const nextProject =
          typeof update === 'function'
            ? (update as (project: Project) => Project)(currentProject)
            : update

        if (nextProject !== currentProject) {
          setUndoStack((currentStack) => [
            ...currentStack.slice(-(HISTORY_LIMIT - 1)),
            currentProject,
          ])
          setRedoStack([])
        }

        return nextProject
      })
    }, [])

  const setProjectWithoutHistory: Dispatch<SetStateAction<Project>> =
    useCallback((update) => {
      setProjectState((currentProject) =>
        typeof update === 'function'
          ? (update as (project: Project) => Project)(currentProject)
          : update,
      )
    }, [])

  const executeScan = useCallback(() => {
    setProjectState((currentProject) => {
      const result = simulateProjectWithState(
        currentProject,
        SCAN_INTERVAL_MS,
        { stopAtBreakpoint: true },
      )

      setSimulationState(result.state)

      if (result.state.breakpointRungId) {
        setSimulationStatus('STOP')
      }

      return result.project
    })
    setScanCount((currentScanCount) => currentScanCount + 1)
  }, [])

  useEffect(() => {
    if (simulationStatus !== 'RUN') {
      return undefined
    }

    const scanIntervalId = window.setInterval(executeScan, SCAN_INTERVAL_MS)

    return () => {
      window.clearInterval(scanIntervalId)
    }
  }, [executeScan, simulationStatus])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(DEBUG_STORAGE_KEY, String(showDebug))
  }, [showDebug])

  const resetRuntimeState = () => {
    setSimulationStatus('STOP')
    setSimulationState(null)
    setScanCount(0)
  }

  const resetHistory = () => {
    setUndoStack([])
    setRedoStack([])
  }

  const handleUndo = useCallback(() => {
    if (simulationStatus === 'RUN') {
      return
    }

    setUndoStack((currentUndoStack) => {
      const previousProject = currentUndoStack[currentUndoStack.length - 1]

      if (!previousProject) {
        return currentUndoStack
      }

      setRedoStack((currentRedoStack) => [
        projectRef.current,
        ...currentRedoStack,
      ])
      setProjectState(previousProject)
      setSimulationState(null)

      return currentUndoStack.slice(0, -1)
    })
  }, [simulationStatus])

  const handleRedo = useCallback(() => {
    if (simulationStatus === 'RUN') {
      return
    }

    setRedoStack((currentRedoStack) => {
      const nextProject = currentRedoStack[0]

      if (!nextProject) {
        return currentRedoStack
      }

      setUndoStack((currentUndoStack) => [
        ...currentUndoStack.slice(-(HISTORY_LIMIT - 1)),
        projectRef.current,
      ])
      setProjectState(nextProject)
      setSimulationState(null)

      return currentRedoStack.slice(1)
    })
  }, [simulationStatus])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        handleUndo()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRedo, handleUndo])

  const handleNewProject = () => {
    setProjectState(migrateProject(demoProject))
    resetRuntimeState()
    resetHistory()
  }

  const handleOpenProject = () => {
    resetRuntimeState()
    fileInputRef.current?.click()
  }

  const handleProjectFileSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const fileContent = await file.text()
      const loadedProject = migrateProject(JSON.parse(fileContent))

      setProjectState(loadedProject)
      resetRuntimeState()
      resetHistory()
    } catch {
      window.alert('Nie udalo sie wczytac projektu PLC Ladder.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSaveProject = () => {
    downloadTextFile(
      'project.plclad',
      JSON.stringify(project, null, 2),
      'application/json',
    )
  }

  const handleExportStructuredText = () => {
    downloadTextFile(
      'project.st',
      exportProjectToStructuredText(project),
      'text/plain',
    )
  }

  const handleRunSimulation = () => {
    setSimulationStatus('RUN')
    setScanCount(0)
    executeScan()
  }

  const handleStopSimulation = () => {
    resetRuntimeState()
  }

  const handleStepScan = () => {
    setSimulationStatus('STOP')
    executeScan()
  }

  const handleResetSimulation = () => {
    setProjectState((currentProject) => resetSimulationProject(currentProject))
    resetRuntimeState()
  }

  return (
    <div className={`app-shell app-shell--${theme}`}>
      <TopBar
        t={t}
        language={language}
        theme={theme}
        showDebug={showDebug}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onShowDebugChange={setShowDebug}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onExportStructuredText={handleExportStructuredText}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onRunSimulation={handleRunSimulation}
        onStopSimulation={handleStopSimulation}
        onStepScan={handleStepScan}
        onResetSimulation={handleResetSimulation}
      />

      <main className="workspace" aria-label="PLC Ladder workspace">
        <BlockLibrary t={t} />
        <LadderEditor
          project={project}
          setProject={setProjectWithHistory}
          simulationStatus={simulationStatus}
          simulationState={simulationState}
          showDebug={showDebug}
          t={t}
        />
        <SimulationPanel
          project={project}
          setProject={setProjectWithoutHistory}
          simulationStatus={simulationStatus}
          scanCount={scanCount}
          scanIntervalMs={SCAN_INTERVAL_MS}
          simulationState={simulationState}
          t={t}
        />
      </main>

      <BottomPanel
        project={project}
        setProject={setProjectWithHistory}
        simulationStatus={simulationStatus}
        t={t}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".plclad,.json,application/json"
        className="file-input"
        onChange={handleProjectFileSelected}
      />
    </div>
  )
}

export default App
