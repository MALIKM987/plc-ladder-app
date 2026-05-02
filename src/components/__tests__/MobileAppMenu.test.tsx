/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations, type TranslationKey } from '../../i18n/translations'
import { MobileAppMenu } from '../MobileAppMenu'

const t = (key: TranslationKey) => translations.pl[key]

function renderMenu(overrides = {}) {
  const props = {
    open: true,
    t,
    language: 'pl' as const,
    theme: 'light' as const,
    showDebug: false,
    canUndo: true,
    canRedo: false,
    onClose: vi.fn(),
    onLanguageChange: vi.fn(),
    onThemeChange: vi.fn(),
    onShowDebugChange: vi.fn(),
    onNewProject: vi.fn(),
    onLoadDemo: vi.fn(),
    onOpenProject: vi.fn(),
    onSaveProject: vi.fn(),
    onExportStructuredText: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onRunSimulation: vi.fn(),
    onStopSimulation: vi.fn(),
    onStepScan: vi.fn(),
    onResetSimulation: vi.fn(),
    onAbout: vi.fn(),
    ...overrides,
  }

  const view = render(<MobileAppMenu {...props} />)

  return { ...props, ...view }
}

describe('MobileAppMenu', () => {
  it('renders grouped mobile actions', () => {
    renderMenu()

    expect(screen.getByText(t('file'))).toBeInTheDocument()
    expect(screen.getByText(t('edit'))).toBeInTheDocument()
    expect(screen.getByText(t('simulation'))).toBeInTheDocument()
    expect(screen.getByText(t('view'))).toBeInTheDocument()
    expect(screen.getByText(t('help'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('save') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('run') })).toBeInTheDocument()
  })

  it('runs an option and closes the menu', () => {
    const onSaveProject = vi.fn()
    const onClose = vi.fn()

    renderMenu({ onSaveProject, onClose })

    fireEvent.click(screen.getByRole('button', { name: t('save') }))

    expect(onSaveProject).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = renderMenu({ onClose })

    fireEvent.click(container.querySelector('.mobile-sheet-backdrop')!)

    expect(onClose).toHaveBeenCalled()
  })
})
