import { LEFT_RAIL_ID, RIGHT_RAIL_ID, isRailId } from '../constants/rails'
import type {
  Connection,
  ElementType,
  LadderElement,
  Project,
  Rung,
  Variable,
  VariableType,
} from '../types/project'
import { isOutputOnlyElement } from './projectActions'

const ELEMENT_TYPES = new Set<ElementType>([
  'NO_CONTACT',
  'NC_CONTACT',
  'COIL',
  'TON',
  'TOF',
  'TP',
  'CTU',
  'CTD',
  'SET_COIL',
  'RESET_COIL',
])

const VARIABLE_TYPES = new Set<VariableType>(['BOOL', 'TIMER', 'COUNTER'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeVariable(raw: unknown, index: number): Variable {
  const record = isRecord(raw) ? raw : {}
  const rawType = record.type
  const type: VariableType =
    typeof rawType === 'string' && VARIABLE_TYPES.has(rawType as VariableType)
      ? (rawType as VariableType)
      : 'BOOL'
  const variable: Variable = {
    id: asString(record.id, `variable-${index + 1}`),
    name: asString(record.name, `Var${index + 1}`),
    address: asString(record.address, `%M0.${index}`),
    type,
    value: asBoolean(record.value),
  }

  if (type === 'TIMER') {
    variable.presetMs = Math.max(0, asNumber(record.presetMs, 1000))
    variable.elapsedMs = Math.max(0, asNumber(record.elapsedMs, 0))
    variable.done = asBoolean(record.done)
    variable.previousInput = asBoolean(record.previousInput)
    variable.value = variable.done
  }

  if (type === 'COUNTER') {
    variable.preset = Math.max(0, asNumber(record.preset, 3))
    variable.count = asNumber(record.count, 0)
    variable.done = asBoolean(record.done)
    variable.previousInput = asBoolean(record.previousInput)
    variable.value = variable.done
  }

  return variable
}

function normalizeElement(raw: unknown, index: number): LadderElement {
  const record = isRecord(raw) ? raw : {}
  const rawType = record.type
  const type: ElementType =
    typeof rawType === 'string' && ELEMENT_TYPES.has(rawType as ElementType)
      ? (rawType as ElementType)
      : 'NO_CONTACT'
  const rawPosition = isRecord(record.position) ? record.position : {}

  return {
    id: asString(record.id, `element-${index + 1}`),
    type,
    variableId: asString(record.variableId, ''),
    position: {
      x: asNumber(rawPosition.x, 120 + index * 160),
      y: asNumber(rawPosition.y, 70),
    },
  }
}

function normalizeConnection(raw: unknown, index: number): Connection {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, `connection-${index + 1}`),
    fromElementId: asString(record.fromElementId, ''),
    toElementId: asString(record.toElementId, ''),
  }
}

function createRailConnectionId(
  rung: Rung,
  fromElementId: string,
  toElementId: string,
) {
  return `connection-${rung.id}-${fromElementId}-${toElementId}`
}

function endpointExists(rung: Rung, elementId: string) {
  return (
    isRailId(elementId) ||
    rung.elements.some((element) => element.id === elementId)
  )
}

function hasConnection(rung: Rung, fromElementId: string, toElementId: string) {
  return rung.connections.some(
    (connection) =>
      connection.fromElementId === fromElementId &&
      connection.toElementId === toElementId,
  )
}

function completeRailConnections(rung: Rung): Rung {
  if (rung.elements.length === 0) {
    return rung
  }

  const connections = rung.connections.filter(
    (connection) =>
      endpointExists(rung, connection.fromElementId) &&
      endpointExists(rung, connection.toElementId) &&
      connection.fromElementId !== connection.toElementId,
  )
  const rungWithValidConnections = { ...rung, connections }
  const incomingCounts = new Map<string, number>()
  const outgoingCounts = new Map<string, number>()

  for (const element of rung.elements) {
    incomingCounts.set(element.id, 0)
    outgoingCounts.set(element.id, 0)
  }

  for (const connection of connections) {
    if (connection.toElementId !== RIGHT_RAIL_ID) {
      incomingCounts.set(
        connection.toElementId,
        (incomingCounts.get(connection.toElementId) ?? 0) + 1,
      )
    }

    if (connection.fromElementId !== LEFT_RAIL_ID) {
      outgoingCounts.set(
        connection.fromElementId,
        (outgoingCounts.get(connection.fromElementId) ?? 0) + 1,
      )
    }
  }

  for (const element of rung.elements) {
    if (
      (incomingCounts.get(element.id) ?? 0) === 0 &&
      !hasConnection(rungWithValidConnections, LEFT_RAIL_ID, element.id)
    ) {
      connections.push({
        id: createRailConnectionId(rung, LEFT_RAIL_ID, element.id),
        fromElementId: LEFT_RAIL_ID,
        toElementId: element.id,
      })
    }

    if (
      ((outgoingCounts.get(element.id) ?? 0) === 0 ||
        isOutputOnlyElement(element.type)) &&
      !hasConnection(rungWithValidConnections, element.id, RIGHT_RAIL_ID)
    ) {
      connections.push({
        id: createRailConnectionId(rung, element.id, RIGHT_RAIL_ID),
        fromElementId: element.id,
        toElementId: RIGHT_RAIL_ID,
      })
    }
  }

  return {
    ...rung,
    connections,
  }
}

function normalizeRung(raw: unknown, index: number): Rung {
  const record = isRecord(raw) ? raw : {}
  const rawElements = Array.isArray(record.elements) ? record.elements : []
  const rawConnections = Array.isArray(record.connections)
    ? record.connections
    : []
  const rung: Rung = {
    id: asString(record.id, `rung-${index + 1}`),
    number: asNumber(record.number, index + 1),
    title: typeof record.title === 'string' ? record.title : '',
    comment: typeof record.comment === 'string' ? record.comment : '',
    breakpoint: asBoolean(record.breakpoint),
    elements: rawElements.map(normalizeElement),
    connections: rawConnections.map(normalizeConnection),
  }

  return completeRailConnections(rung)
}

export function migrateProject(raw: unknown): Project {
  const record = isRecord(raw) ? raw : {}
  const rawVariables = Array.isArray(record.variables) ? record.variables : []
  const rawRungs = Array.isArray(record.rungs) ? record.rungs : []

  return {
    id: asString(record.id, 'project'),
    name: asString(record.name, 'PLC Ladder Project'),
    version: asString(record.version, '2.0.0'),
    variables: rawVariables.map(normalizeVariable),
    rungs: rawRungs.map(normalizeRung).map((rung, index) => ({
      ...rung,
      number: index + 1,
    })),
  }
}
