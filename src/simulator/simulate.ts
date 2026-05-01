import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type { LadderElement, Project, Rung, Variable } from '../types/project'
import type { SimulationState } from './simulationState'

const DEFAULT_SCAN_DELTA_MS = 200

type SimulationTrace = {
  activeElementIds: Set<string>
  activeConnectionIds: Set<string>
  coilValues: Record<string, boolean>
  elementSignals: Record<string, boolean>
  connectionSignals: Record<string, boolean>
  breakpointRungId?: string
}

export type SimulationContext = {
  variables: Map<string, Variable>
  trace: SimulationTrace
  scanDeltaMs: number
  updatedTimerIds: Set<string>
  updatedCounterIds: Set<string>
  memo: Map<string, boolean>
}

type SimulationOptions = {
  stopAtBreakpoint?: boolean
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

function getVariable(context: SimulationContext, element: LadderElement) {
  return context.variables.get(element.variableId)
}

function getPresetMs(variable: Variable) {
  return Math.max(0, variable.presetMs ?? 1000)
}

function evaluateTimer(
  element: LadderElement,
  inputSignal: boolean,
  context: SimulationContext,
) {
  const variable = getVariable(context, element)

  if (!variable || variable.type !== 'TIMER') {
    return false
  }

  const alreadyUpdated = context.updatedTimerIds.has(variable.id)

  if (alreadyUpdated) {
    return variable.done ?? variable.value
  }

  context.updatedTimerIds.add(variable.id)

  const presetMs = getPresetMs(variable)

  if (element.type === 'TON') {
    if (!inputSignal) {
      variable.elapsedMs = 0
      variable.done = false
      variable.value = false
      variable.previousInput = false
      return false
    }

    const elapsedMs = Math.min(
      presetMs,
      (variable.elapsedMs ?? 0) + context.scanDeltaMs,
    )
    const done = elapsedMs >= presetMs

    variable.presetMs = presetMs
    variable.elapsedMs = elapsedMs
    variable.done = done
    variable.value = done
    variable.previousInput = true
    return done
  }

  if (element.type === 'TOF') {
    variable.presetMs = presetMs

    if (inputSignal) {
      variable.elapsedMs = 0
      variable.done = true
      variable.value = true
      variable.previousInput = true
      return true
    }

    const wasOn = variable.done === true || variable.value === true

    if (!wasOn) {
      variable.elapsedMs = 0
      variable.done = false
      variable.value = false
      variable.previousInput = false
      return false
    }

    const elapsedMs = Math.min(
      presetMs,
      (variable.elapsedMs ?? 0) + context.scanDeltaMs,
    )
    const done = elapsedMs < presetMs

    variable.elapsedMs = elapsedMs
    variable.done = done
    variable.value = done
    variable.previousInput = false
    return done
  }

  if (element.type === 'TP') {
    const risingEdge = inputSignal && !variable.previousInput
    const wasRunning = variable.done === true || variable.value === true

    variable.presetMs = presetMs

    if (risingEdge && !wasRunning) {
      variable.elapsedMs = 0
      variable.done = true
      variable.value = true
      variable.previousInput = inputSignal
      return true
    }

    if (wasRunning) {
      const elapsedMs = Math.min(
        presetMs,
        (variable.elapsedMs ?? 0) + context.scanDeltaMs,
      )
      const done = elapsedMs < presetMs

      variable.elapsedMs = elapsedMs
      variable.done = done
      variable.value = done
      variable.previousInput = inputSignal
      return done
    }

    variable.elapsedMs = 0
    variable.done = false
    variable.value = false
    variable.previousInput = inputSignal
    return false
  }

  return false
}

function evaluateCounter(
  element: LadderElement,
  inputSignal: boolean,
  context: SimulationContext,
) {
  const variable = getVariable(context, element)

  if (!variable || variable.type !== 'COUNTER') {
    return false
  }

  const alreadyUpdated = context.updatedCounterIds.has(variable.id)

  if (alreadyUpdated) {
    return variable.done ?? variable.value
  }

  context.updatedCounterIds.add(variable.id)

  const preset = Math.max(0, variable.preset ?? 3)
  const currentCount = variable.count ?? 0
  const risingEdge = inputSignal && !variable.previousInput
  let nextCount = currentCount

  if (risingEdge && element.type === 'CTU') {
    nextCount += 1
  }

  if (risingEdge && element.type === 'CTD') {
    nextCount -= 1
  }

  const done = element.type === 'CTD' ? nextCount <= 0 : nextCount >= preset

  variable.preset = preset
  variable.count = nextCount
  variable.done = done
  variable.value = done
  variable.previousInput = inputSignal

  return done
}

function evaluateElementSignal(
  element: LadderElement,
  inputSignal: boolean,
  context: SimulationContext,
) {
  const variable = getVariable(context, element)

  if (element.type === 'NO_CONTACT') {
    return inputSignal && variable?.value === true
  }

  if (element.type === 'NC_CONTACT') {
    return inputSignal && variable?.value === false
  }

  if (
    element.type === 'TON' ||
    element.type === 'TOF' ||
    element.type === 'TP'
  ) {
    return evaluateTimer(element, inputSignal, context)
  }

  if (element.type === 'CTU' || element.type === 'CTD') {
    return evaluateCounter(element, inputSignal, context)
  }

  if (element.type === 'COIL') {
    if (variable && variable.type === 'BOOL') {
      variable.value = inputSignal
    }

    return inputSignal
  }

  if (element.type === 'SET_COIL') {
    if (inputSignal && variable && variable.type === 'BOOL') {
      variable.value = true
    }

    return inputSignal
  }

  if (element.type === 'RESET_COIL') {
    if (inputSignal && variable && variable.type === 'BOOL') {
      variable.value = false
    }

    return inputSignal
  }

  return inputSignal
}

export function evaluateElement(
  elementId: string,
  rung: Rung,
  context: SimulationContext,
  visited: Set<string>,
): boolean {
  if (context.memo.has(elementId)) {
    return context.memo.get(elementId) ?? false
  }

  if (visited.has(elementId)) {
    context.trace.elementSignals[elementId] = false
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
  let inputSignal = false

  for (const connection of incomingConnections) {
    const parentResult =
      connection.fromElementId === LEFT_RAIL_ID
        ? true
        : evaluateElement(connection.fromElementId, rung, context, visited)

    context.trace.connectionSignals[connection.id] = parentResult

    if (parentResult) {
      inputSignal = true
      context.trace.activeConnectionIds.add(connection.id)
    }
  }

  const result = evaluateElementSignal(element, inputSignal, context)

  context.trace.elementSignals[element.id] = result

  if (
    result ||
    ((element.type === 'TON' ||
      element.type === 'TOF' ||
      element.type === 'TP' ||
      element.type === 'CTU' ||
      element.type === 'CTD') &&
      inputSignal)
  ) {
    context.trace.activeElementIds.add(element.id)
  }

  if (
    element.type === 'COIL' ||
    element.type === 'SET_COIL' ||
    element.type === 'RESET_COIL'
  ) {
    context.trace.coilValues[element.id] = result
  }

  visited.delete(elementId)
  context.memo.set(elementId, result)

  return result
}

function getRungEvaluationTargets(rung: Rung) {
  const targets = new Set<string>()

  for (const element of rung.elements) {
    if (
      element.type === 'COIL' ||
      element.type === 'SET_COIL' ||
      element.type === 'RESET_COIL'
    ) {
      targets.add(element.id)
    }
  }

  for (const connection of rung.connections) {
    if (connection.toElementId === RIGHT_RAIL_ID) {
      targets.add(connection.fromElementId)
    }
  }

  return [...targets].filter(
    (elementId) =>
      elementId !== LEFT_RAIL_ID &&
      elementId !== RIGHT_RAIL_ID &&
      rung.elements.some((element) => element.id === elementId),
  )
}

export function evaluateRung(rung: Rung, context: SimulationContext) {
  let rungResult = false
  const targets = getRungEvaluationTargets(rung)

  for (const targetElementId of targets) {
    const result = evaluateElement(targetElementId, rung, context, new Set())

    for (const connection of rung.connections) {
      if (
        connection.fromElementId === targetElementId &&
        connection.toElementId === RIGHT_RAIL_ID
      ) {
        context.trace.connectionSignals[connection.id] = result

        if (result) {
          context.trace.activeConnectionIds.add(connection.id)
        }
      }
    }

    rungResult = rungResult || result
  }

  return rungResult
}

export function simulateProjectWithState(
  project: Project,
  scanDeltaMs = DEFAULT_SCAN_DELTA_MS,
  options: SimulationOptions = {},
): {
  project: Project
  state: SimulationState
} {
  const nextProject = cloneProject(project)
  const trace: SimulationTrace = {
    activeElementIds: new Set(),
    activeConnectionIds: new Set(),
    coilValues: {},
    elementSignals: {},
    connectionSignals: {},
  }
  const context: SimulationContext = {
    variables: new Map(
      nextProject.variables.map((variable) => [variable.id, variable]),
    ),
    trace,
    scanDeltaMs,
    updatedTimerIds: new Set(),
    updatedCounterIds: new Set(),
    memo: new Map(),
  }

  for (const rung of nextProject.rungs) {
    if (options.stopAtBreakpoint && rung.breakpoint) {
      trace.breakpointRungId = rung.id
      break
    }

    evaluateRung(rung, context)
  }

  return {
    project: nextProject,
    state: {
      activeElementIds: [...trace.activeElementIds],
      activeConnectionIds: [...trace.activeConnectionIds],
      coilValues: trace.coilValues,
      elementSignals: trace.elementSignals,
      connectionSignals: trace.connectionSignals,
      breakpointRungId: trace.breakpointRungId,
    },
  }
}

export function simulateProject(project: Project): Project {
  return simulateProjectWithState(project, DEFAULT_SCAN_DELTA_MS).project
}
