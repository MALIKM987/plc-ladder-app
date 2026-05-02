import type { TranslationKey } from '../i18n/translations'
import type { ElementType } from '../types/project'

export type BlockItem = {
  type: ElementType
  labelKey: TranslationKey
  helpKey: TranslationKey
}

export type BlockGroup = {
  titleKey: TranslationKey
  items: BlockItem[]
}

export const blockGroups: BlockGroup[] = [
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
