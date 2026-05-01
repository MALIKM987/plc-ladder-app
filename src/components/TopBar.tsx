type ToolbarAction = {
  label: string
  onClick: () => void
}

type TopBarProps = {
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onRunSimulation: () => void
  onStopSimulation: () => void
}

export function TopBar({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onRunSimulation,
  onStopSimulation,
}: TopBarProps) {
  const toolbarActions: ToolbarAction[] = [
    { label: 'Nowy', onClick: onNewProject },
    { label: 'Otwórz', onClick: onOpenProject },
    { label: 'Zapisz', onClick: onSaveProject },
    { label: 'Uruchom', onClick: onRunSimulation },
    { label: 'Stop', onClick: onStopSimulation },
  ]

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          LD
        </span>
        <div>
          <h1>PLC Ladder Editor</h1>
          <p>Projekt logiki drabinkowej</p>
        </div>
      </div>

      <nav className="topbar__actions" aria-label="Akcje projektu">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="toolbar-button"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
