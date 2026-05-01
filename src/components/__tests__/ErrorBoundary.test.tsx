/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

function BrokenComponent(): ReactElement {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when a child crashes', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Wystąpił błąd aplikacji')).toBeInTheDocument()
    expect(screen.getByText('Odśwież aplikację')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Odśwież' })).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
