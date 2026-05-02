import type { Language, TranslationKey } from '../i18n/translations'

type Theme = 'light' | 'dark'

type MobileAppMenuProps = {
  open: boolean
  t: (key: TranslationKey) => string
  language: Language
  theme: Theme
  showDebug: boolean
  canUndo: boolean
  canRedo: boolean
  onClose: () => void
  onLanguageChange: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  onShowDebugChange: (showDebug: boolean) => void
  onNewProject: () => void
  onLoadDemo: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onExportStructuredText: () => void
  onUndo: () => void
  onRedo: () => void
  onRunSimulation: () => void
  onStopSimulation: () => void
  onStepScan: () => void
  onResetSimulation: () => void
  onAbout: () => void
}

type MenuAction = {
  label: string
  disabled?: boolean
  action: () => void
}

function MobileMenuSection({
  title,
  actions,
  onClose,
}: {
  title: string
  actions: MenuAction[]
  onClose: () => void
}) {
  return (
    <section className="mobile-app-menu__section">
      <h3>{title}</h3>
      <div className="mobile-app-menu__items">
        {actions.map((item) => (
          <button
            key={item.label}
            type="button"
            className="mobile-touch-button"
            disabled={item.disabled}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function MobileAppMenu({
  open,
  t,
  language,
  theme,
  showDebug,
  canUndo,
  canRedo,
  onClose,
  onLanguageChange,
  onThemeChange,
  onShowDebugChange,
  onNewProject,
  onLoadDemo,
  onOpenProject,
  onSaveProject,
  onExportStructuredText,
  onUndo,
  onRedo,
  onRunSimulation,
  onStopSimulation,
  onStepScan,
  onResetSimulation,
  onAbout,
}: MobileAppMenuProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="mobile-sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="mobile-sheet mobile-app-menu"
        aria-label={t('menu')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet__header">
          <h2>{t('menu')}</h2>
          <button type="button" onClick={onClose}>
            {t('close')}
          </button>
        </div>

        <MobileMenuSection
          title={t('file')}
          onClose={onClose}
          actions={[
            { label: t('new'), action: onNewProject },
            { label: t('open'), action: onOpenProject },
            { label: t('save'), action: onSaveProject },
            { label: t('exportSt'), action: onExportStructuredText },
            { label: t('loadDemo'), action: onLoadDemo },
          ]}
        />

        <MobileMenuSection
          title={t('edit')}
          onClose={onClose}
          actions={[
            { label: t('undo'), action: onUndo, disabled: !canUndo },
            { label: t('redo'), action: onRedo, disabled: !canRedo },
          ]}
        />

        <MobileMenuSection
          title={t('simulation')}
          onClose={onClose}
          actions={[
            { label: t('run'), action: onRunSimulation },
            { label: t('stop'), action: onStopSimulation },
            { label: t('stepScan'), action: onStepScan },
            { label: t('resetSimulation'), action: onResetSimulation },
          ]}
        />

        <MobileMenuSection
          title={t('view')}
          onClose={onClose}
          actions={[
            {
              label: theme === 'dark' ? t('lightMode') : t('darkMode'),
              action: () => onThemeChange(theme === 'dark' ? 'light' : 'dark'),
            },
            {
              label: showDebug ? t('debugOff') : t('debugOn'),
              action: () => onShowDebugChange(!showDebug),
            },
            {
              label:
                language === 'pl'
                  ? `${t('language')}: English`
                  : `${t('language')}: Polski`,
              action: () => onLanguageChange(language === 'pl' ? 'en' : 'pl'),
            },
          ]}
        />

        <MobileMenuSection
          title={t('help')}
          onClose={onClose}
          actions={[{ label: t('about'), action: onAbout }]}
        />
      </aside>
    </div>
  )
}
