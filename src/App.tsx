import {
  type ChangeEvent,
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
import type { Language } from './i18n/translations'
import { useTranslation } from './i18n/useTranslation'
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

function App() {
  const [project, setProject] = useState<Project>(demoProject)
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
  const { t } = useTranslation(language)

  const executeScan = useCallback(() => {
    setProject((currentProject) => {
      const result = simulateProjectWithState(
        currentProject,
        SCAN_INTERVAL_MS,
      )

      setSimulationState(result.state)
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

  const handleNewProject = () => {
    setProject(structuredClone(demoProject))
    resetRuntimeState()
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
      const loadedProject = JSON.parse(fileContent) as Project

      setProject(loadedProject)
      resetRuntimeState()
    } catch {
      window.alert('Nie udalo sie wczytac projektu PLC Ladder.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSaveProject = () => {
    const fileContent = JSON.stringify(project, null, 2)
    const blob = new Blob([fileContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'project.plclad'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleRunSimulation = () => {
    setSimulationStatus('RUN')
    setScanCount(0)
    executeScan()
  }

  const handleStopSimulation = () => {
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
        onRunSimulation={handleRunSimulation}
        onStopSimulation={handleStopSimulation}
      />

      <main className="workspace" aria-label="PLC Ladder workspace">
        <BlockLibrary t={t} />
        <LadderEditor
          project={project}
          setProject={setProject}
          simulationStatus={simulationStatus}
          simulationState={simulationState}
          showDebug={showDebug}
          t={t}
        />
        <SimulationPanel
          project={project}
          setProject={setProject}
          simulationStatus={simulationStatus}
          scanCount={scanCount}
          scanIntervalMs={SCAN_INTERVAL_MS}
          t={t}
        />
      </main>

      <BottomPanel
        project={project}
        setProject={setProject}
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
