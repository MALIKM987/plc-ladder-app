import type { Project } from '../types/project'
import { ValidationPanel } from './ValidationPanel'
import { VariableTable } from './VariableTable'

type BottomPanelProps = {
  project: Project
}

export function BottomPanel({ project }: BottomPanelProps) {
  return (
    <footer className="bottom-panel" aria-label="Zmienne i komunikaty">
      <VariableTable project={project} />
      <ValidationPanel project={project} />
    </footer>
  )
}
