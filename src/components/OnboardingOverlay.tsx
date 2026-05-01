import type { TranslationKey } from '../i18n/translations'

type OnboardingOverlayProps = {
  t: (key: TranslationKey) => string
  onDismiss: () => void
  onLoadDemo: () => void
}

export function OnboardingOverlay({
  t,
  onDismiss,
  onLoadDemo,
}: OnboardingOverlayProps) {
  return (
    <aside className="onboarding" aria-label={t('onboardingTitle')}>
      <div className="onboarding__card">
        <div>
          <strong>{t('onboardingTitle')}</strong>
          <ul>
            <li>{t('onboardingDrag')}</li>
            <li>{t('onboardingInput')}</li>
            <li>{t('onboardingPower')}</li>
            <li>{t('onboardingOutput')}</li>
            <li>{t('onboardingRun')}</li>
            <li>{t('onboardingToggle')}</li>
          </ul>
        </div>
        <div className="onboarding__actions">
          <button type="button" onClick={onDismiss}>
            {t('onboardingDismiss')}
          </button>
          <button type="button" onClick={onLoadDemo}>
            {t('loadDemo')}
          </button>
        </div>
      </div>
    </aside>
  )
}
