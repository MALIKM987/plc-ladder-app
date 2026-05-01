import type { LadderElement, Variable } from '../types/project'
import type { SimulationContext } from './evaluate'

function getVariable(context: SimulationContext, element: LadderElement) {
  return context.variables.get(element.variableId)
}

function getPresetMs(variable: Variable) {
  return Math.max(0, variable.presetMs ?? 1000)
}

export function evaluateTimer(
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
      const elapsedMs = Math.min(presetMs, context.scanDeltaMs)
      const done = elapsedMs < presetMs

      variable.elapsedMs = elapsedMs
      variable.done = done
      variable.value = done
      variable.previousInput = inputSignal
      return done
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
