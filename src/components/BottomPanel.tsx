import type { Dispatch, SetStateAction } from 'react'
import type { Project } from '../types/project'
import { ValidationPanel } from './ValidationPanel'
import { VariableTable } from './VariableTable'

type BottomPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
}

export function BottomPanel({
  project,
  setProject,
  simulationStatus,
}: BottomPanelProps) {
  return (
    <footer className="bottom-panel" aria-label="Zmienne i komunikaty">
      <VariableTable
        project={project}
        setProject={setProject}
        simulationStatus={simulationStatus}
      />
      <ValidationPanel project={project} />
    </footer>
  )
}
