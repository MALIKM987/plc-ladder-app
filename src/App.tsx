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
import { simulateProjectWithState } from './simulator/simulate'
import type { SimulationState } from './simulator/simulationState'
import type { Project } from './types/project'
import './App.css'

type SimulationStatus = 'RUN' | 'STOP'
const SCAN_INTERVAL_MS = 200

function App() {
  const [project, setProject] = useState<Project>(demoProject)
  const [simulationStatus, setSimulationStatus] =
    useState<SimulationStatus>('STOP')
  const [simulationState, setSimulationState] =
    useState<SimulationState | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleNewProject = () => {
    setProject(structuredClone(demoProject))
    setSimulationStatus('STOP')
    setSimulationState(null)
    setScanCount(0)
  }

  const handleOpenProject = () => {
    setSimulationStatus('STOP')
    setSimulationState(null)
    setScanCount(0)
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
      setSimulationStatus('STOP')
      setSimulationState(null)
      setScanCount(0)
    } catch {
      window.alert('Nie udało się wczytać projektu PLC Ladder.')
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
    setSimulationStatus('STOP')
    setSimulationState(null)
    setScanCount(0)
  }

  return (
    <div className="app-shell">
      <TopBar
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onRunSimulation={handleRunSimulation}
        onStopSimulation={handleStopSimulation}
      />

      <main className="workspace" aria-label="Obszar roboczy edytora PLC">
        <BlockLibrary />
        <LadderEditor
          project={project}
          setProject={setProject}
          simulationStatus={simulationStatus}
          simulationState={simulationState}
        />
        <SimulationPanel
          project={project}
          setProject={setProject}
          simulationStatus={simulationStatus}
          scanCount={scanCount}
          scanIntervalMs={SCAN_INTERVAL_MS}
        />
      </main>

      <BottomPanel
        project={project}
        setProject={setProject}
        simulationStatus={simulationStatus}
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
