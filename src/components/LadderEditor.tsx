import type { ElementType, LadderElement, Project } from '../types/project'

type LadderEditorProps = {
  project: Project
  simulationStatus: 'RUN' | 'STOP'
}

function getElementClass(type: ElementType) {
  return type === 'COIL' ? 'ladder-coil' : 'ladder-contact'
}

function getElementLabel(element: LadderElement, project: Project) {
  const variable = project.variables.find(
    (candidate) => candidate.id === element.variableId,
  )
  const variableName = variable?.name ?? 'Brak zmiennej'

  if (element.type === 'NC_CONTACT') {
    return `|/| ${variableName}`
  }

  if (element.type === 'COIL') {
    return `( ) ${variableName}`
  }

  return `| | ${variableName}`
}

export function LadderEditor({
  project,
  simulationStatus,
}: LadderEditorProps) {
  return (
    <section className="editor" aria-labelledby="ladder-editor-title">
      <div className="panel__header editor__header">
        <div>
          <h2 id="ladder-editor-title">Edytor drabinkowy</h2>
          <p>{project.name}</p>
        </div>
        <span className="editor__status">
          {simulationStatus === 'RUN' ? 'Symulacja RUN' : 'Tryb edycji'}
        </span>
      </div>

      <div className="ladder-canvas" aria-label="Podgląd szczebli drabinki">
        <div className="ladder-bus ladder-bus--left" aria-hidden="true" />
        <div className="ladder-bus ladder-bus--right" aria-hidden="true" />

        {project.rungs.map((rung) => {
          const elements = [...rung.elements].sort(
            (first, second) => first.position.x - second.position.x,
          )

          return (
            <div key={rung.id} className="ladder-rung">
              <span className="ladder-rung__number">
                {String(rung.number).padStart(3, '0')}
              </span>
              <div className="ladder-line" aria-hidden="true" />
              {elements.map((element) => (
                <div key={element.id} className={getElementClass(element.type)}>
                  {getElementLabel(element, project)}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
