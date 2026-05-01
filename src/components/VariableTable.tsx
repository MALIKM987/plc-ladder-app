import type { Project } from '../types/project'

type VariableTableProps = {
  project: Project
}

function formatValue(value: boolean) {
  return value ? 'TRUE' : 'FALSE'
}

export function VariableTable({ project }: VariableTableProps) {
  return (
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
            {project.variables.map((variable) => (
              <tr key={variable.id}>
                <td>{variable.name}</td>
                <td>{variable.type}</td>
                <td>{variable.address}</td>
                <td>{formatValue(variable.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
