/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { translations, type TranslationKey } from '../../i18n/translations'
import { createBoolVariable, createProject } from '../../test/builders'
import type { Project } from '../../types/project'
import { SimulationPanel } from '../SimulationPanel'

const t = (key: TranslationKey) => translations.pl[key]

function createSimulationProject() {
  return createProject({
    variables: [
      createBoolVariable({
        id: 'start',
        name: 'Start',
        address: '%I0.0',
        value: false,
      }),
      createBoolVariable({
        id: 'motor',
        name: 'Motor',
        address: '%Q0.0',
        value: false,
      }),
    ],
  })
}

function SimulationPanelHarness({
  initialProject,
  simulationStatus = 'STOP',
}: {
  initialProject: Project
  simulationStatus?: 'RUN' | 'STOP'
}) {
  const [project, setProject] = useState(initialProject)

  return (
    <SimulationPanel
      project={project}
      setProject={setProject}
      simulationStatus={simulationStatus}
      scanCount={15}
      scanIntervalMs={200}
      simulationState={null}
      showDebug
      t={t}
    />
  )
}

describe('SimulationPanel', () => {
  it('shows RUN/STOP and scan count', () => {
    render(
      <SimulationPanelHarness
        initialProject={createSimulationProject()}
        simulationStatus="RUN"
      />,
    )

    expect(screen.getByText('RUN')).toBeInTheDocument()
    expect(screen.getAllByText('15')).toHaveLength(2)
    expect(screen.getByText('200 ms')).toBeInTheDocument()
  })

  it('toggles input variables', () => {
    render(<SimulationPanelHarness initialProject={createSimulationProject()} />)

    const startButton = screen.getByText('Start').closest('button')

    expect(startButton).not.toBeNull()
    expect(within(startButton as HTMLButtonElement).getByText('FALSE')).toBeInTheDocument()

    fireEvent.click(startButton as HTMLButtonElement)

    const updatedStartButton = screen.getByText('Start').closest('button')

    expect(
      within(updatedStartButton as HTMLButtonElement).getByText('TRUE'),
    ).toBeInTheDocument()
  })
})
