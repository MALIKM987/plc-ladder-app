import type { Project, Rung, Variable } from '../types/project'
import { evaluateRung, type SimulationContext, type SimulationTrace } from './evaluate'
import type { SimulationState } from './simulationState'

const DEFAULT_SCAN_DELTA_MS = 200

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

function createTrace(): SimulationTrace {
  return {
    activeElementIds: new Set(),
    activeConnectionIds: new Set(),
    coilValues: {},
    elementSignals: {},
    connectionSignals: {},
  }
}

function createContext(
  variables: Variable[],
  trace: SimulationTrace,
  scanDeltaMs: number,
): SimulationContext {
  return {
    variables: new Map(variables.map((variable) => [variable.id, variable])),
    trace,
    scanDeltaMs,
    updatedTimerIds: new Set(),
    updatedCounterIds: new Set(),
    memo: new Map(),
  }
}

function evaluateProjectRungs(
  rungs: Rung[],
  context: SimulationContext,
  options: SimulationOptions,
) {
  for (const rung of rungs) {
    if (options.stopAtBreakpoint && rung.breakpoint) {
      context.trace.breakpointRungId = rung.id
      break
    }

    evaluateRung(rung, context)
  }
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
  const trace = createTrace()
  const context = createContext(nextProject.variables, trace, scanDeltaMs)

  evaluateProjectRungs(nextProject.rungs, context, options)

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
