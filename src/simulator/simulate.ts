import type { LadderElement, Project, Rung, Variable } from '../types/project'
import type { SimulationState } from './simulationState'

const DEFAULT_SCAN_DELTA_MS = 200

type SimulationTrace = {
  activeElementIds: Set<string>
  activeConnectionIds: Set<string>
  coilValues: Record<string, boolean>
}

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
  scanDeltaMs: number,
) {
  const variable = getVariable(variables, element)

  if (element.type === 'NO_CONTACT') {
    return inputSignal && variable?.value === true
  }

  if (element.type === 'NC_CONTACT') {
    return inputSignal && variable?.value === false
  }

  if (element.type === 'TON') {
    if (!variable || variable.type !== 'TIMER') {
      return false
    }

    if (!inputSignal) {
      variable.elapsedMs = 0
      variable.done = false
      variable.value = false
      return false
    }

    const presetMs = variable.presetMs ?? 1000
    const elapsedMs = Math.min(
      presetMs,
      (variable.elapsedMs ?? 0) + scanDeltaMs,
    )
    const done = elapsedMs >= presetMs

    variable.presetMs = presetMs
    variable.elapsedMs = elapsedMs
    variable.done = done
    variable.value = done

    return done
  }

  return inputSignal
}

export function evaluateElement(
  elementId: string,
  rung: Rung,
  variables: Map<string, Variable>,
  visited: Set<string>,
  memo = new Map<string, boolean>(),
  trace?: SimulationTrace,
  scanDeltaMs = DEFAULT_SCAN_DELTA_MS,
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
  let inputSignal = incomingConnections.length === 0

  for (const connection of incomingConnections) {
    const parentResult = evaluateElement(
      connection.fromElementId,
      rung,
      variables,
      visited,
      memo,
      trace,
      scanDeltaMs,
    )

    if (parentResult) {
      inputSignal = true
      trace?.activeConnectionIds.add(connection.id)
    }
  }

  const result = evaluateElementSignal(
    element,
    inputSignal,
    variables,
    scanDeltaMs,
  )

  if (result || (element.type === 'TON' && inputSignal)) {
    trace?.activeElementIds.add(element.id)
  }

  visited.delete(elementId)
  memo.set(elementId, result)

  return result
}

export function evaluateRung(
  rung: Rung,
  variables: Map<string, Variable>,
  trace?: SimulationTrace,
  scanDeltaMs = DEFAULT_SCAN_DELTA_MS,
) {
  let rungResult = false
  const outputElements = rung.elements.filter(
    (element) => element.type === 'COIL' || element.type === 'TON',
  )
  const memo = new Map<string, boolean>()

  for (const outputElement of outputElements) {
    const result = evaluateElement(
      outputElement.id,
      rung,
      variables,
      new Set(),
      memo,
      trace,
      scanDeltaMs,
    )

    if (outputElement.type === 'COIL') {
      const variable = getVariable(variables, outputElement)

      if (variable) {
        variable.value = result
      }
    }

    if (trace && outputElement.type === 'COIL') {
      trace.coilValues[outputElement.id] = result
    }

    rungResult = rungResult || result
  }

  return rungResult
}

export function simulateProjectWithState(
  project: Project,
  scanDeltaMs = DEFAULT_SCAN_DELTA_MS,
): {
  project: Project
  state: SimulationState
} {
  const nextProject = cloneProject(project)
  const variablesById = new Map(
    nextProject.variables.map((variable) => [variable.id, variable]),
  )
  const trace: SimulationTrace = {
    activeElementIds: new Set(),
    activeConnectionIds: new Set(),
    coilValues: {},
  }

  for (const rung of nextProject.rungs) {
    evaluateRung(rung, variablesById, trace, scanDeltaMs)
  }

  return {
    project: nextProject,
    state: {
      activeElementIds: [...trace.activeElementIds],
      activeConnectionIds: [...trace.activeConnectionIds],
      coilValues: trace.coilValues,
    },
  }
}

export function simulateProject(project: Project): Project {
  return simulateProjectWithState(project, DEFAULT_SCAN_DELTA_MS).project
}
