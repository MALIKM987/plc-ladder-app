/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations, type TranslationKey } from '../../i18n/translations'
import { MobileBlockPicker } from '../MobileBlockPicker'

const t = (key: TranslationKey) => translations.pl[key]

describe('MobileBlockPicker', () => {
  it('renders block categories and options', () => {
    render(
      <MobileBlockPicker
        open
        t={t}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText(t('contacts'))).toBeInTheDocument()
    expect(screen.getByText(t('coils'))).toBeInTheDocument()
    expect(screen.getByText(t('timers'))).toBeInTheDocument()
    expect(screen.getByText(t('counters'))).toBeInTheDocument()
    expect(screen.getByText(t('noContact'))).toBeInTheDocument()
    expect(screen.getByText(t('ctd'))).toBeInTheDocument()
  })

  it('selects a block and closes the sheet', () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()

    render(
      <MobileBlockPicker open t={t} onClose={onClose} onSelect={onSelect} />,
    )

    fireEvent.click(screen.getByText(t('ton')).closest('button')!)

    expect(onSelect).toHaveBeenCalledWith('TON')
    expect(onClose).toHaveBeenCalled()
  })
})
