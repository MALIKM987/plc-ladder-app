/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations, type TranslationKey } from '../../i18n/translations'
import {
  createBoolVariable,
  createElement,
  createProject,
  createRung,
} from '../../test/builders'
import { PropertiesPanel } from '../PropertiesPanel'

const t = (key: TranslationKey) => translations.pl[key]

function setMobileViewport(mobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(max-width: 768px)' ? mobile : !mobile,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

function createPanelProject() {
  const start = createBoolVariable({
    id: 'start',
    name: 'Start',
    address: '%I0.0',
  })
  const contact = createElement({
    id: 'contact',
    type: 'NO_CONTACT',
    variableId: start.id,
  })

  return createProject({
    variables: [start],
    rungs: [
      createRung({
        id: 'rung',
        number: 1,
        title: 'Motor start',
        comment: 'Start rung',
        elements: [contact],
      }),
    ],
  })
}

type RenderPanelOptions = {
  selectedElementId?: string | null
  selectedEdgeId?: string | null
  selectedRungId?: string | null
  onClearSelection?: () => void
}

function renderPanel({
  selectedElementId = null,
  selectedEdgeId = null,
  selectedRungId = 'rung',
  onClearSelection = vi.fn(),
}: RenderPanelOptions = {}) {
  const project = createPanelProject()

  render(
    <PropertiesPanel
      project={project}
      setProject={vi.fn()}
      simulationStatus="STOP"
      selectedElementId={selectedElementId}
      selectedEdgeId={selectedEdgeId}
      selectedRungId={selectedRungId}
      onClearSelection={onClearSelection}
      t={t}
    />,
  )

  return { project, onClearSelection }
}

describe('PropertiesPanel', () => {
  it('renders a shared header', () => {
    setMobileViewport(false)
    renderPanel()

    expect(screen.getByText(t('rungProperties'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t('collapsePanel') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t('closePanel') }),
    ).toBeInTheDocument()
  })

  it('collapses and hides the rung form', () => {
    setMobileViewport(false)
    renderPanel()

    expect(screen.getByLabelText(t('rungTitle'))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: t('collapsePanel') }))

    expect(screen.queryByLabelText(t('rungTitle'))).not.toBeInTheDocument()
    expect(screen.getByText('Szczebel 001: Motor start')).toBeInTheDocument()
  })

  it('expands and shows the rung form again', () => {
    setMobileViewport(false)
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: t('collapsePanel') }))
    fireEvent.click(screen.getByRole('button', { name: t('expandPanel') }))

    expect(screen.getByLabelText(t('rungTitle'))).toBeInTheDocument()
  })

  it('calls onClearSelection when closed', () => {
    setMobileViewport(false)
    const onClearSelection = vi.fn()
    renderPanel({ onClearSelection })

    fireEvent.click(screen.getByRole('button', { name: t('closePanel') }))

    expect(onClearSelection).toHaveBeenCalled()
  })

  it('collapses rung properties by default on mobile and shows only summary', async () => {
    setMobileViewport(true)
    renderPanel()

    await waitFor(() => {
      expect(
        screen.queryByLabelText(t('rungTitle')),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByText('Szczebel 001: Motor start')).toBeInTheDocument()
  })

  it('keeps selected element properties expanded on mobile', () => {
    setMobileViewport(true)
    renderPanel({ selectedElementId: 'contact' })

    expect(screen.getByDisplayValue('NO_CONTACT')).toBeInTheDocument()
    expect(screen.getByText('Element: NO_CONTACT')).toBeInTheDocument()
  })
})
