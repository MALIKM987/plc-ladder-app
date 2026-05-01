import type { DragEvent } from 'react'
import { LADDER_ELEMENT_DRAG_TYPE } from '../constants/dragDrop'
import type { TranslationKey } from '../i18n/translations'
import type { ElementType } from '../types/project'

type BlockLibraryProps = {
  t: (key: TranslationKey) => string
}

type BlockItem = {
  type: ElementType
  labelKey: TranslationKey
  helpKey: TranslationKey
}

type BlockGroup = {
  titleKey: TranslationKey
  items: BlockItem[]
}

const blockGroups: BlockGroup[] = [
  {
    titleKey: 'contacts',
    items: [
      { type: 'NO_CONTACT', labelKey: 'noContact', helpKey: 'noContactHelp' },
      { type: 'NC_CONTACT', labelKey: 'ncContact', helpKey: 'ncContactHelp' },
    ],
  },
  {
    titleKey: 'coils',
    items: [
      { type: 'COIL', labelKey: 'coil', helpKey: 'coilHelp' },
      { type: 'SET_COIL', labelKey: 'setCoil', helpKey: 'setCoilHelp' },
      {
        type: 'RESET_COIL',
        labelKey: 'resetCoil',
        helpKey: 'resetCoilHelp',
      },
    ],
  },
  {
    titleKey: 'timers',
    items: [
      { type: 'TON', labelKey: 'ton', helpKey: 'tonHelp' },
      { type: 'TOF', labelKey: 'tof', helpKey: 'tofHelp' },
      { type: 'TP', labelKey: 'tp', helpKey: 'tpHelp' },
    ],
  },
  {
    titleKey: 'counters',
    items: [
      { type: 'CTU', labelKey: 'ctu', helpKey: 'ctuHelp' },
      { type: 'CTD', labelKey: 'ctd', helpKey: 'ctdHelp' },
    ],
  },
]

export function BlockLibrary({ t }: BlockLibraryProps) {
  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    type: ElementType,
  ) => {
    event.dataTransfer.setData(LADDER_ELEMENT_DRAG_TYPE, type)
    event.dataTransfer.setData('text/plain', type)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="panel panel--left" aria-labelledby="block-library-title">
      <div className="panel__header">
        <h2 id="block-library-title">{t('blockLibrary')}</h2>
      </div>

      <div className="block-library">
        {blockGroups.map((group) => (
          <section key={group.titleKey} className="block-group">
            <h3>{t(group.titleKey)}</h3>
            <div className="block-list">
              {group.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="block-item"
                  draggable
                  title={t(item.helpKey)}
                  onDragStart={(event) => handleDragStart(event, item.type)}
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
  )
}
