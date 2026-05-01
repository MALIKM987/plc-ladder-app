import type { TranslationKey } from '../i18n/translations'

type AutosavePromptProps = {
  t: (key: TranslationKey) => string
  onRestore: () => void
  onStartDemo: () => void
}

export function AutosavePrompt({
  t,
  onRestore,
  onStartDemo,
}: AutosavePromptProps) {
  return (
    <aside className="autosave-prompt" aria-label={t('autosaveTitle')}>
      <div className="autosave-prompt__card">
        <div>
          <strong>{t('autosaveTitle')}</strong>
          <p>{t('autosaveMessage')}</p>
        </div>
        <div className="autosave-prompt__actions">
          <button type="button" onClick={onRestore}>
            {t('restoreLastProject')}
          </button>
          <button type="button" onClick={onStartDemo}>
            {t('startFromDemo')}
          </button>
        </div>
      </div>
    </aside>
  )
}
