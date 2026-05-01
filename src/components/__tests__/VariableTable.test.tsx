/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { translations, type TranslationKey } from '../../i18n/translations'
import { createBoolVariable, createProject } from '../../test/builders'
import type { Project } from '../../types/project'
import { VariableTable } from '../VariableTable'

const t = (key: TranslationKey) => translations.pl[key]

function createVariableTableProject() {
  return createProject({
    variables: [
      createBoolVariable({
        id: 'start',
        name: 'Start',
        address: '%I0.0',
        value: false,
      }),
    ],
  })
}

function VariableTableHarness({
  initialProject,
  simulationStatus = 'STOP',
}: {
  initialProject: Project
  simulationStatus?: 'RUN' | 'STOP'
}) {
  const [project, setProject] = useState(initialProject)

  return (
    <VariableTable
      project={project}
      setProject={setProject}
      simulationStatus={simulationStatus}
      onNotify={vi.fn()}
      t={t}
    />
  )
}

describe('VariableTable', () => {
  it('renders variables', () => {
    render(<VariableTableHarness initialProject={createVariableTableProject()} />)

    expect(screen.getByDisplayValue('Start')).toBeInTheDocument()
    expect(screen.getByDisplayValue('%I0.0')).toBeInTheDocument()
  })

  it('allows editing variable name in STOP', () => {
    render(<VariableTableHarness initialProject={createVariableTableProject()} />)

    fireEvent.change(screen.getByLabelText('Nazwa Start'), {
      target: { value: 'StartButton' },
    })

    expect(screen.getByDisplayValue('StartButton')).toBeInTheDocument()
  })

  it('is read-only in RUN', () => {
    render(
      <VariableTableHarness
        initialProject={createVariableTableProject()}
        simulationStatus="RUN"
      />,
    )

    expect(screen.getByLabelText('Nazwa Start')).toBeDisabled()
    expect(screen.getByRole('button', { name: '+ Dodaj BOOL' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Usuń' })).toBeDisabled()
  })
})
