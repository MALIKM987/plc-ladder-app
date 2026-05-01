import type { LadderElement, Project, Rung, Variable } from '../types/project'

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

function evaluateElementSignal(
  element: LadderElement,
  inputSignal: boolean,
  variables: Map<string, Variable>,
) {
  const variable = getVariable(variables, element)

  if (element.type === 'NO_CONTACT') {
    return inputSignal && variable?.value === true
  }

  if (element.type === 'NC_CONTACT') {
    return inputSignal && variable?.value === false
  }

  return inputSignal
}

export function evaluateElement(
  elementId: string,
  rung: Rung,
  variables: Map<string, Variable>,
  visited: Set<string>,
  memo = new Map<string, boolean>(),
): boolean {
  if (memo.has(elementId)) {
    return memo.get(elementId) ?? false
  }

  if (visited.has(elementId)) {
    return false
  }

  const element = rung.elements.find((candidate) => candidate.id === elementId)

  if (!element) {
    return false
  }

  visited.add(elementId)

  const incomingConnections = rung.connections.filter(
    (connection) => connection.toElementId === elementId,
  )
  const inputSignal =
    incomingConnections.length === 0
      ? true
      : incomingConnections.some((connection) =>
          evaluateElement(
            connection.fromElementId,
            rung,
            variables,
            visited,
            memo,
          ),
        )
  const result = evaluateElementSignal(element, inputSignal, variables)

  visited.delete(elementId)
  memo.set(elementId, result)

  return result
}

export function evaluateRung(rung: Rung, variables: Map<string, Variable>) {
  let rungResult = false
  const coils = rung.elements.filter((element) => element.type === 'COIL')

  for (const coil of coils) {
    const result = evaluateElement(coil.id, rung, variables, new Set())
    const variable = getVariable(variables, coil)

    if (variable) {
      variable.value = result
    }

    rungResult = rungResult || result
  }

  return rungResult
}

export function simulateProject(project: Project): Project {
  const nextProject = cloneProject(project)
  const variablesById = new Map(
    nextProject.variables.map((variable) => [variable.id, variable]),
  )

  for (const rung of nextProject.rungs) {
    evaluateRung(rung, variablesById)
  }

  return nextProject
}
