import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PLC Ladder application error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          <section className="error-boundary__card">
            <h1>Wystąpił błąd aplikacji</h1>
            <button type="button" onClick={() => window.location.reload()}>
              Odśwież
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
