import type { LadderElement } from '../types/project'
import type { SimulationContext } from './evaluate'

function getVariable(context: SimulationContext, element: LadderElement) {
  return context.variables.get(element.variableId)
}

export function evaluateCounter(
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
