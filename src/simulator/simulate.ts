import type { LadderElement, Project, Variable } from '../types/project'

function cloneProject(project: Project): Project {
  return {
    ...project,
    variables: project.variables.map((variable) => ({ ...variable })),
    rungs: project.rungs.map((rung) => ({
      ...rung,
      elements: rung.elements.map((element) => ({
        ...element,
        position: { ...element.position },
      })),
      connections: rung.connections.map((connection) => ({ ...connection })),
    })),
  }
}

function getVariable(
  variablesById: Map<string, Variable>,
  element: LadderElement,
) {
  return variablesById.get(element.variableId)
}

export function simulateProject(project: Project): Project {
  const nextProject = cloneProject(project)
  const variablesById = new Map(
    nextProject.variables.map((variable) => [variable.id, variable]),
  )

  for (const rung of nextProject.rungs) {
    const elements = [...rung.elements].sort(
      (first, second) => first.position.x - second.position.x,
    )
    let signal = true

    for (const element of elements) {
      const variable = getVariable(variablesById, element)

      if (element.type === 'NO_CONTACT') {
        signal = signal && variable?.value === true
      }

      if (element.type === 'NC_CONTACT') {
        signal = signal && variable?.value === false
      }

      if (element.type === 'COIL' && variable) {
        variable.value = signal
      }
    }
  }

  return nextProject
}
