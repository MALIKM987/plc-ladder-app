/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LADDER_ELEMENT_DRAG_TYPE } from '../../constants/dragDrop'
import { translations, type TranslationKey } from '../../i18n/translations'
import { BlockLibrary } from '../BlockLibrary'

const t = (key: TranslationKey) => translations.pl[key]

describe('BlockLibrary', () => {
  it('stores element type during drag start', () => {
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
    }

    render(<BlockLibrary t={t} />)

    const noContactButton = screen.getByText('Styk NO').closest('button')

    expect(noContactButton).not.toBeNull()

    fireEvent.dragStart(noContactButton as HTMLButtonElement, {
      dataTransfer,
    })

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      LADDER_ELEMENT_DRAG_TYPE,
      'NO_CONTACT',
    )
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'text/plain',
      'NO_CONTACT',
    )
    expect(dataTransfer.effectAllowed).toBe('copy')
  })
})
