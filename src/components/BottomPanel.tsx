const variables = [
  { name: 'Start', type: 'BOOL', address: '%I0.0', value: 'FALSE' },
  { name: 'Stop', type: 'BOOL', address: '%I0.1', value: 'FALSE' },
  { name: 'Motor', type: 'BOOL', address: '%Q0.0', value: 'FALSE' },
]

const messages = [
  'Brak uruchomionej symulacji.',
  'Nie zdefiniowano jeszcze reguł walidacji.',
]

export function BottomPanel() {
  return (
    <footer className="bottom-panel" aria-label="Zmienne i komunikaty">
      <section className="variables" aria-labelledby="variables-title">
        <div className="panel__header">
          <h2 id="variables-title">Tabela zmiennych</h2>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Typ</th>
                <th>Adres</th>
                <th>Wartość</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((variable) => (
                <tr key={variable.name}>
                  <td>{variable.name}</td>
                  <td>{variable.type}</td>
                  <td>{variable.address}</td>
                  <td>{variable.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="messages" aria-labelledby="messages-title">
        <div className="panel__header">
          <h2 id="messages-title">Komunikaty błędów</h2>
        </div>

        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>
    </footer>
  )
}
