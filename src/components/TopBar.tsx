const toolbarActions = ['Nowy', 'Otwórz', 'Zapisz', 'Uruchom', 'Stop']

export function TopBar() {
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
          <button key={action} type="button" className="toolbar-button">
            {action}
          </button>
        ))}
      </nav>
    </header>
  )
}
