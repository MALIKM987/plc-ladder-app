import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type { LadderElement, Rung, Variable } from '../types/project'
import { evaluateCounter } from './counters'
import { evaluateTimer } from './timers'

export type SimulationTrace = {
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

function getVariable(context: SimulationContext, element: LadderElement) {
  return context.variables.get(element.variableId)
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
