import type { TranslationKey } from '../i18n/translations'
import type { ElementType } from '../types/project'
import { blockGroups } from './blockGroups'

type MobileBlockPickerProps = {
  open: boolean
  t: (key: TranslationKey) => string
  onClose: () => void
  onSelect: (elementType: ElementType) => void
}

export function MobileBlockPicker({
  open,
  t,
  onClose,
  onSelect,
}: MobileBlockPickerProps) {
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
        className="mobile-sheet mobile-block-picker"
        aria-label={t('chooseBlock')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet__header">
          <h2>{t('chooseBlock')}</h2>
          <button type="button" onClick={onClose}>
            {t('close')}
          </button>
        </div>

        <div className="mobile-block-picker__groups">
          {blockGroups.map((group) => (
            <section key={group.titleKey} className="mobile-block-picker__group">
              <h3>{t(group.titleKey)}</h3>
              <div className="mobile-block-picker__items">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="mobile-touch-button"
                    title={t(item.helpKey)}
                    onClick={() => {
                      onSelect(item.type)
                      onClose()
                    }}
                  >
                    <span>{t(item.labelKey)}</span>
                    <small>{t(item.helpKey)}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}
