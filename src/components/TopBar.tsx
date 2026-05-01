import type { Language, TranslationKey } from '../i18n/translations'

type Theme = 'light' | 'dark'

type TopBarProps = {
  t: (key: TranslationKey) => string
  language: Language
  theme: Theme
  showDebug: boolean
  onLanguageChange: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  onShowDebugChange: (showDebug: boolean) => void
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onExportStructuredText: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onRunSimulation: () => void
  onStopSimulation: () => void
  onStepScan: () => void
  onResetSimulation: () => void
}

export function TopBar({
  t,
  language,
  theme,
  showDebug,
  onLanguageChange,
  onThemeChange,
  onShowDebugChange,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportStructuredText,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRunSimulation,
  onStopSimulation,
  onStepScan,
  onResetSimulation,
}: TopBarProps) {
  const handleAbout = () => {
    window.alert(t('aboutMessage'))
  }

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          LD
        </span>
        <div>
          <h1>PLC Ladder Editor</h1>
          <p>{t('appSubtitle')}</p>
        </div>
      </div>

      <nav className="app-menu" aria-label="Menu aplikacji">
        <details className="app-menu__group">
          <summary>{t('file')}</summary>
          <div className="app-menu__items">
            <button type="button" onClick={onNewProject}>
              {t('new')}
            </button>
            <button type="button" onClick={onOpenProject}>
              {t('open')}
            </button>
            <button type="button" onClick={onSaveProject}>
              {t('save')}
            </button>
            <button type="button" onClick={onExportStructuredText}>
              {t('exportSt')}
            </button>
          </div>
        </details>

        <details className="app-menu__group">
          <summary>{t('edit')}</summary>
          <div className="app-menu__items">
            <button type="button" disabled={!canUndo} onClick={onUndo}>
              {t('undo')}
            </button>
            <button type="button" disabled={!canRedo} onClick={onRedo}>
              {t('redo')}
            </button>
          </div>
        </details>

        <details className="app-menu__group">
          <summary>{t('simulation')}</summary>
          <div className="app-menu__items">
            <button type="button" onClick={onRunSimulation}>
              {t('run')}
            </button>
            <button type="button" onClick={onStopSimulation}>
              {t('stop')}
            </button>
            <button type="button" onClick={onStepScan}>
              {t('stepScan')}
            </button>
            <button type="button" onClick={onResetSimulation}>
              {t('resetSimulation')}
            </button>
          </div>
        </details>

        <details className="app-menu__group">
          <summary>{t('view')}</summary>
          <div className="app-menu__items app-menu__items--wide">
            <button
              type="button"
              onClick={() =>
                onThemeChange(theme === 'dark' ? 'light' : 'dark')
              }
            >
              {theme === 'dark' ? t('lightMode') : t('darkMode')}
            </button>
            <button
              type="button"
              onClick={() => onShowDebugChange(!showDebug)}
            >
              {showDebug ? t('hideDebug') : t('showDebug')}
            </button>
            <label className="app-menu__select">
              {t('language')}
              <select
                value={language}
                onChange={(event) =>
                  onLanguageChange(event.target.value as Language)
                }
              >
                <option value="pl">{t('polish')}</option>
                <option value="en">{t('english')}</option>
              </select>
            </label>
          </div>
        </details>

        <details className="app-menu__group">
          <summary>{t('help')}</summary>
          <div className="app-menu__items">
            <button type="button" onClick={handleAbout}>
              {t('about')}
            </button>
          </div>
        </details>
      </nav>
    </header>
  )
}
