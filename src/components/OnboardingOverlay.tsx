import type { TranslationKey } from '../i18n/translations'

type OnboardingOverlayProps = {
  t: (key: TranslationKey) => string
  onClose: () => void
}

export function OnboardingOverlay({ t, onClose }: OnboardingOverlayProps) {
  return (
    <aside className="onboarding" aria-label={t('onboardingTitle')}>
      <div className="onboarding__card">
        <div>
          <strong>{t('onboardingTitle')}</strong>
          <ul>
            <li>{t('onboardingDrag')}</li>
            <li>{t('onboardingInput')}</li>
            <li>{t('onboardingRun')}</li>
          </ul>
        </div>
        <button type="button" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </aside>
  )
}
