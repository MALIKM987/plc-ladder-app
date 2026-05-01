import { type ChangeEvent, useRef, useState } from 'react'
import { BlockLibrary } from './components/BlockLibrary'
import { BottomPanel } from './components/BottomPanel'
import { LadderEditor } from './components/LadderEditor'
import { SimulationPanel } from './components/SimulationPanel'
import { TopBar } from './components/TopBar'
import { demoProject } from './data/demoProject'
import { simulateProject } from './simulator/simulate'
import type { Project } from './types/project'
import './App.css'

type SimulationStatus = 'RUN' | 'STOP'

function App() {
  const [project, setProject] = useState<Project>(demoProject)
  const [simulationStatus, setSimulationStatus] =
    useState<SimulationStatus>('STOP')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNewProject = () => {
    setProject(structuredClone(demoProject))
    setSimulationStatus('STOP')
  }

  const handleOpenProject = () => {
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
    setProject((currentProject) => simulateProject(currentProject))
  }

  const handleStopSimulation = () => {
    setSimulationStatus('STOP')
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
        <LadderEditor project={project} simulationStatus={simulationStatus} />
        <SimulationPanel
          project={project}
          setProject={setProject}
          simulationStatus={simulationStatus}
        />
      </main>

      <BottomPanel project={project} />

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
