export type ToastMessage = {
  id: string
  message: string
}

type ToastViewportProps = {
  toasts: ToastMessage[]
}

export function ToastViewport({ toasts }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  )
}
