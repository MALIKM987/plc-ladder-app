import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import type {
  Connection,
  ElementType,
  LadderElement,
  Project,
  Rung,
  Variable,
} from '../types/project'

let idCounter = 0

function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

export function createBoolVariable(
  patch: Partial<Variable> = {},
): Variable {
  const id = patch.id ?? nextId('bool')

  return {
    id,
    name: patch.name ?? id,
    address: patch.address ?? `%M0.${idCounter}`,
    type: 'BOOL',
    value: patch.value ?? false,
  }
}

export function createTimerVariable(
  patch: Partial<Variable> = {},
): Variable {
  const id = patch.id ?? nextId('timer')

  return {
    id,
    name: patch.name ?? id,
    address: patch.address ?? `%T${idCounter}`,
    type: 'TIMER',
    value: patch.value ?? false,
    presetMs: patch.presetMs ?? 1000,
    elapsedMs: patch.elapsedMs ?? 0,
    done: patch.done ?? false,
    previousInput: patch.previousInput ?? false,
  }
}

export function createCounterVariable(
  patch: Partial<Variable> = {},
): Variable {
  const id = patch.id ?? nextId('counter')

  return {
    id,
    name: patch.name ?? id,
    address: patch.address ?? `%C${idCounter}`,
    type: 'COUNTER',
    value: patch.value ?? false,
    preset: patch.preset ?? 3,
    count: patch.count ?? 0,
    done: patch.done ?? false,
    previousInput: patch.previousInput ?? false,
  }
}

export function createElement(
  patch: Partial<LadderElement> & {
    type?: ElementType
    variableId: string
  },
): LadderElement {
  return {
    id: patch.id ?? nextId('element'),
    type: patch.type ?? 'NO_CONTACT',
    variableId: patch.variableId,
    position: patch.position ?? { x: 120 + idCounter * 120, y: 70 },
  }
}

export function connectLeft(toElementId: string): Connection {
  return {
    id: nextId('connection'),
    fromElementId: LEFT_RAIL_ID,
    toElementId,
  }
}

export function connect(
  fromElementId: string,
  toElementId: string,
): Connection {
  return {
    id: nextId('connection'),
    fromElementId,
    toElementId,
  }
}

export function connectRight(fromElementId: string): Connection {
  return {
    id: nextId('connection'),
    fromElementId,
    toElementId: RIGHT_RAIL_ID,
  }
}

export function createRung(patch: Partial<Rung> = {}): Rung {
  return {
    id: patch.id ?? nextId('rung'),
    number: patch.number ?? 1,
    title: patch.title ?? '',
    comment: patch.comment ?? '',
    breakpoint: patch.breakpoint ?? false,
    elements: patch.elements ?? [],
    connections: patch.connections ?? [],
  }
}

export function createProject(patch: Partial<Project> = {}): Project {
  return {
    id: patch.id ?? 'project-test',
    name: patch.name ?? 'Test Project',
    version: patch.version ?? '2.0.0',
    variables: patch.variables ?? [],
    rungs: patch.rungs ?? [],
  }
}
