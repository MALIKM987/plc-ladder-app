import type { Dispatch, SetStateAction } from 'react'
import type { TranslationKey } from '../i18n/translations'
import type { Project } from '../types/project'
import { ValidationPanel } from './ValidationPanel'
import { VariableTable } from './VariableTable'

type BottomPanelProps = {
  project: Project
  setProject: Dispatch<SetStateAction<Project>>
  simulationStatus: 'RUN' | 'STOP'
  onNotify: (message: string) => void
  t: (key: TranslationKey) => string
}

export function BottomPanel({
  project,
  setProject,
  simulationStatus,
  onNotify,
  t,
}: BottomPanelProps) {
  return (
    <footer className="bottom-panel" aria-label="Zmienne i komunikaty">
      <VariableTable
        project={project}
        setProject={setProject}
        simulationStatus={simulationStatus}
        onNotify={onNotify}
        t={t}
      />
      <ValidationPanel project={project} t={t} />
    </footer>
  )
}
