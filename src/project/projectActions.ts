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

const ELEMENT_SPACING = 160
const FIRST_ELEMENT_X = 120
const FIRST_TIMER_INDEX = 1
const FIRST_COUNTER_INDEX = 1
const DEFAULT_NODE_Y = 70
export const GRID_SIZE = 20

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function snapPosition(position: { x: number; y: number }) {
  return {
    x: Math.max(0, Math.round(position.x / GRID_SIZE) * GRID_SIZE),
    y: Math.max(0, Math.round(position.y / GRID_SIZE) * GRID_SIZE),
  }
}

function cloneElement(element: LadderElement): LadderElement {
  return {
    ...element,
    position: { ...element.position },
  }
}

function cloneRung(rung: Rung): Rung {
  return {
    ...rung,
    elements: rung.elements.map(cloneElement),
    connections: rung.connections.map((connection) => ({ ...connection })),
  }
}

function cloneVariable(variable: Variable): Variable {
  return { ...variable }
}

function getNextElementX(rung: Rung) {
  if (rung.elements.length === 0) {
    return FIRST_ELEMENT_X
  }

  return (
    Math.max(...rung.elements.map((element) => element.position.x)) +
    ELEMENT_SPACING
  )
}

function getLastElement(rung: Rung) {
  return [...rung.elements].sort(
    (first, second) => first.position.x - second.position.x,
  )[rung.elements.length - 1]
}

export function isTimerElement(elementType: ElementType) {
  return elementType === 'TON' || elementType === 'TOF' || elementType === 'TP'
}

export function isCounterElement(elementType: ElementType) {
  return elementType === 'CTU' || elementType === 'CTD'
}

export function isOutputOnlyElement(elementType: ElementType) {
  return (
    elementType === 'COIL' ||
    elementType === 'SET_COIL' ||
    elementType === 'RESET_COIL'
  )
}

export function getRequiredVariableType(
  elementType: ElementType,
): VariableType {
  if (isTimerElement(elementType)) {
    return 'TIMER'
  }

  if (isCounterElement(elementType)) {
    return 'COUNTER'
  }

  return 'BOOL'
}

function getDefaultVariableId(project: Project, elementType: ElementType) {
  const preferredType = getRequiredVariableType(elementType)

  return (
    project.variables.find((variable) => variable.type === preferredType)?.id ??
    project.variables[0]?.id ??
    ''
  )
}

function isVariableUsed(project: Project, variableId: string) {
  return project.rungs.some((rung) =>
    rung.elements.some((element) => element.variableId === variableId),
  )
}

function getUniqueVariableName(project: Project) {
  const names = new Set(project.variables.map((variable) => variable.name))

  if (!names.has('NewVar')) {
    return 'NewVar'
  }

  let index = 1

  while (names.has(`NewVar${index}`)) {
    index += 1
  }

  return `NewVar${index}`
}

function getUniqueMarkerAddress(project: Project) {
  const addresses = new Set(
    project.variables.map((variable) => variable.address),
  )
  let bitIndex = 0

  while (addresses.has(`%M0.${bitIndex}`)) {
    bitIndex += 1
  }

  return `%M0.${bitIndex}`
}

function getUniqueTimerName(project: Project) {
  const names = new Set(project.variables.map((variable) => variable.name))
  let index = FIRST_TIMER_INDEX

  while (names.has(`Timer${index}`)) {
    index += 1
  }

  return `Timer${index}`
}

function getUniqueTimerAddress(project: Project) {
  const addresses = new Set(
    project.variables.map((variable) => variable.address),
  )
  let index = FIRST_TIMER_INDEX

  while (addresses.has(`%T${index}`)) {
    index += 1
  }

  return `%T${index}`
}

function getUniqueCounterName(project: Project) {
  const names = new Set(project.variables.map((variable) => variable.name))
  let index = FIRST_COUNTER_INDEX

  while (names.has(`Counter${index}`)) {
    index += 1
  }

  return `Counter${index}`
}

function getUniqueCounterAddress(project: Project) {
  const addresses = new Set(
    project.variables.map((variable) => variable.address),
  )
  let index = FIRST_COUNTER_INDEX

  while (addresses.has(`%C${index}`)) {
    index += 1
  }

  return `%C${index}`
}

function buildBoolVariable(project: Project): Variable {
  return {
    id: createId('variable'),
    name: getUniqueVariableName(project),
    address: getUniqueMarkerAddress(project),
    type: 'BOOL',
    value: false,
  }
}

function buildTimerVariable(project: Project): Variable {
  return {
    id: createId('variable'),
    name: getUniqueTimerName(project),
    address: getUniqueTimerAddress(project),
    type: 'TIMER',
    value: false,
    presetMs: 1000,
    elapsedMs: 0,
    done: false,
    previousInput: false,
  }
}

function buildCounterVariable(project: Project): Variable {
  return {
    id: createId('variable'),
    name: getUniqueCounterName(project),
    address: getUniqueCounterAddress(project),
    type: 'COUNTER',
    value: false,
    preset: 3,
    count: 0,
    done: false,
    previousInput: false,
  }
}

function ensureVariableForElement(
  project: Project,
  elementType: ElementType,
): { project: Project; variableId: string } {
  const expectedType = getRequiredVariableType(elementType)
  const existingVariable = project.variables.find(
    (variable) => variable.type === expectedType,
  )

  if (existingVariable) {
    return { project, variableId: existingVariable.id }
  }

  const nextProject =
    expectedType === 'TIMER'
      ? createTimerVariable(project)
      : expectedType === 'COUNTER'
        ? createCounterVariable(project)
        : createBoolVariable(project)
  const createdVariable = nextProject.variables[nextProject.variables.length - 1]

  return {
    project: nextProject,
    variableId: createdVariable?.id ?? '',
  }
}

function getNodeIdsForCycleCheck(rung: Rung) {
  return [LEFT_RAIL_ID, RIGHT_RAIL_ID, ...rung.elements.map((element) => element.id)]
}

export function wouldCreateCycle(
  rung: Rung,
  fromElementId: string,
  toElementId: string,
) {
  if (fromElementId === toElementId) {
    return true
  }

  const outgoingByElementId = new Map<string, string[]>()

  for (const elementId of getNodeIdsForCycleCheck(rung)) {
    outgoingByElementId.set(elementId, [])
  }

  for (const connection of rung.connections) {
    outgoingByElementId
      .get(connection.fromElementId)
      ?.push(connection.toElementId)
  }

  const visited = new Set<string>()
  const stack = [toElementId]

  while (stack.length > 0) {
    const currentElementId = stack.pop()

    if (!currentElementId || visited.has(currentElementId)) {
      continue
    }

    if (currentElementId === fromElementId) {
      return true
    }

    visited.add(currentElementId)
    stack.push(...(outgoingByElementId.get(currentElementId) ?? []))
  }

  return false
}

export function addRung(project: Project): Project {
  const nextNumber =
    Math.max(0, ...project.rungs.map((rung) => rung.number)) + 1

  return {
    ...project,
    rungs: [
      ...project.rungs.map(cloneRung),
      {
        id: createId('rung'),
        number: nextNumber,
        title: '',
        comment: '',
        breakpoint: false,
        elements: [],
        connections: [],
      },
    ],
  }
}

export function removeRung(project: Project, rungId: string): Project {
  return {
    ...project,
    rungs: project.rungs
      .filter((rung) => rung.id !== rungId)
      .map((rung, index) => ({
        ...cloneRung(rung),
        number: index + 1,
      })),
  }
}

export function updateRung(
  project: Project,
  rungId: string,
  patch: Partial<Pick<Rung, 'title' | 'comment' | 'breakpoint'>>,
): Project {
  return {
    ...project,
    variables: project.variables.map(cloneVariable),
    rungs: project.rungs.map((rung) =>
      rung.id === rungId ? { ...cloneRung(rung), ...patch } : cloneRung(rung),
    ),
  }
}

export function autoLayoutRung(project: Project, rungId: string): Project {
  return {
    ...project,
    variables: project.variables.map(cloneVariable),
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      const sortedElements = [...rung.elements].sort(
        (first, second) => first.position.x - second.position.x,
      )
      const positionsById = new Map(
        sortedElements.map((element, index) => [
          element.id,
          { x: FIRST_ELEMENT_X + index * ELEMENT_SPACING, y: DEFAULT_NODE_Y },
        ]),
      )

      return {
        ...cloneRung(rung),
        elements: rung.elements.map((element) => ({
          ...element,
          position: positionsById.get(element.id) ?? { ...element.position },
        })),
      }
    }),
  }
}

export function addVariable(project: Project): Project {
  return createBoolVariable(project)
}

export function createBoolVariable(project: Project): Project {
  return {
    ...project,
    variables: [
      ...project.variables.map(cloneVariable),
      buildBoolVariable(project),
    ],
    rungs: project.rungs.map(cloneRung),
  }
}

export function createTimerVariable(project: Project): Project {
  return {
    ...project,
    variables: [
      ...project.variables.map(cloneVariable),
      buildTimerVariable(project),
    ],
    rungs: project.rungs.map(cloneRung),
  }
}

export function createCounterVariable(project: Project): Project {
  return {
    ...project,
    variables: [
      ...project.variables.map(cloneVariable),
      buildCounterVariable(project),
    ],
    rungs: project.rungs.map(cloneRung),
  }
}

export function removeVariable(project: Project, variableId: string): Project {
  if (isVariableUsed(project, variableId)) {
    return project
  }

  return {
    ...project,
    variables: project.variables
      .filter((variable) => variable.id !== variableId)
      .map(cloneVariable),
    rungs: project.rungs.map(cloneRung),
  }
}

export function updateVariable(
  project: Project,
  variableId: string,
  patch: Partial<Omit<Variable, 'id'>>,
): Project {
  return {
    ...project,
    variables: project.variables.map((variable) =>
      variable.id === variableId
        ? normalizeVariablePatch(variable, patch)
        : cloneVariable(variable),
    ),
    rungs: project.rungs.map(cloneRung),
  }
}

function normalizeVariablePatch(
  variable: Variable,
  patch: Partial<Omit<Variable, 'id'>>,
): Variable {
  if (patch.type === 'TIMER') {
    return {
      ...variable,
      ...patch,
      type: 'TIMER',
      value: false,
      presetMs: patch.presetMs ?? variable.presetMs ?? 1000,
      elapsedMs: patch.elapsedMs ?? 0,
      done: patch.done ?? false,
      previousInput: patch.previousInput ?? false,
    }
  }

  if (patch.type === 'COUNTER') {
    return {
      ...variable,
      ...patch,
      type: 'COUNTER',
      value: false,
      preset: patch.preset ?? variable.preset ?? 3,
      count: patch.count ?? variable.count ?? 0,
      done: patch.done ?? false,
      previousInput: patch.previousInput ?? false,
    }
  }

  if (patch.type === 'BOOL') {
    const nextVariable: Variable = {
      ...variable,
      ...patch,
      type: 'BOOL',
      value: patch.value ?? false,
    }

    delete nextVariable.presetMs
    delete nextVariable.elapsedMs
    delete nextVariable.preset
    delete nextVariable.count
    delete nextVariable.done
    delete nextVariable.previousInput

    return nextVariable
  }

  return {
    ...variable,
    ...patch,
  }
}

export function addElement(
  project: Project,
  rungId: string,
  type: ElementType,
  options: {
    id?: string
    position?: { x: number; y: number }
    autoConnect?: boolean
  } = {},
): Project {
  const ensured = ensureVariableForElement(project, type)
  const defaultVariableId =
    ensured.variableId || getDefaultVariableId(ensured.project, type)
  const autoConnect = options.autoConnect ?? true

  return {
    ...ensured.project,
    rungs: ensured.project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      const clonedRung = cloneRung(rung)
      const lastElement = getLastElement(clonedRung)
      const newElement: LadderElement = {
        id: options.id ?? createId('element'),
        type,
        variableId: defaultVariableId,
        position: snapPosition(
          options.position ?? {
            x: getNextElementX(rung),
            y: DEFAULT_NODE_Y,
          },
        ),
      }

      return {
        ...clonedRung,
        elements: [...clonedRung.elements, newElement],
        connections:
          autoConnect && lastElement && !isOutputOnlyElement(lastElement.type)
            ? [
                ...clonedRung.connections,
                {
                  id: createId('connection'),
                  fromElementId: lastElement.id,
                  toElementId: newElement.id,
                },
              ]
            : clonedRung.connections,
      }
    }),
  }
}

export function removeElement(
  project: Project,
  rungId: string,
  elementId: string,
  options: { reconnect?: boolean } = { reconnect: true },
): Project {
  return {
    ...project,
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      const incomingConnection = rung.connections.find(
        (connection) => connection.toElementId === elementId,
      )
      const outgoingConnection = rung.connections.find(
        (connection) => connection.fromElementId === elementId,
      )
      const nextConnections = rung.connections
        .filter(
          (connection) =>
            connection.fromElementId !== elementId &&
            connection.toElementId !== elementId,
        )
        .map((connection) => ({ ...connection }))
      const nextElements = rung.elements
        .filter((element) => element.id !== elementId)
        .map(cloneElement)
      const reconnectFromElement = nextElements.find(
        (element) => element.id === incomingConnection?.fromElementId,
      )
      const reconnectExists = nextConnections.some(
        (connection) =>
          connection.fromElementId === incomingConnection?.fromElementId &&
          connection.toElementId === outgoingConnection?.toElementId,
      )
      const rungAfterRemoval: Rung = {
        ...rung,
        elements: nextElements,
        connections: nextConnections,
      }

      if (
        options.reconnect !== false &&
        incomingConnection &&
        outgoingConnection &&
        incomingConnection.toElementId !== RIGHT_RAIL_ID &&
        outgoingConnection.fromElementId !== LEFT_RAIL_ID &&
        reconnectFromElement?.type !== 'COIL' &&
        reconnectFromElement?.type !== 'SET_COIL' &&
        reconnectFromElement?.type !== 'RESET_COIL' &&
        incomingConnection.fromElementId !== outgoingConnection.toElementId &&
        !reconnectExists &&
        !wouldCreateCycle(
          rungAfterRemoval,
          incomingConnection.fromElementId,
          outgoingConnection.toElementId,
        )
      ) {
        nextConnections.push({
          id: createId('connection'),
          fromElementId: incomingConnection.fromElementId,
          toElementId: outgoingConnection.toElementId,
        })
      }

      return {
        ...rung,
        elements: nextElements,
        connections: nextConnections,
      }
    }),
  }
}

export function updateElementVariable(
  project: Project,
  elementId: string,
  variableId: string,
): Project {
  return {
    ...project,
    rungs: project.rungs.map((rung) => ({
      ...rung,
      elements: rung.elements.map((element) =>
        element.id === elementId
          ? {
              ...element,
              variableId,
              position: { ...element.position },
            }
          : cloneElement(element),
      ),
      connections: rung.connections.map((connection) => ({ ...connection })),
    })),
  }
}

export function updateElementPosition(
  project: Project,
  elementId: string,
  position: { x: number; y: number },
): Project {
  const snappedPosition = snapPosition(position)

  return {
    ...project,
    rungs: project.rungs.map((rung) => ({
      ...rung,
      elements: rung.elements.map((element) =>
        element.id === elementId
          ? {
              ...element,
              position: { ...snappedPosition },
            }
          : cloneElement(element),
      ),
      connections: rung.connections.map((connection) => ({ ...connection })),
    })),
  }
}

export function addConnection(
  project: Project,
  rungId: string,
  fromElementId: string,
  toElementId: string,
): Project {
  if (
    fromElementId === toElementId ||
    (fromElementId === LEFT_RAIL_ID && toElementId === RIGHT_RAIL_ID) ||
    fromElementId === RIGHT_RAIL_ID ||
    toElementId === LEFT_RAIL_ID
  ) {
    return project
  }

  return {
    ...project,
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      const connectionExists = rung.connections.some(
        (connection) =>
          connection.fromElementId === fromElementId &&
          connection.toElementId === toElementId,
      )
      const fromElement = rung.elements.find(
        (element) => element.id === fromElementId,
      )
      const toElement = rung.elements.find(
        (element) => element.id === toElementId,
      )
      const sourceValid = fromElementId === LEFT_RAIL_ID || Boolean(fromElement)
      const targetValid = toElementId === RIGHT_RAIL_ID || Boolean(toElement)

      if (
        !sourceValid ||
        !targetValid ||
        connectionExists ||
        (fromElement && isOutputOnlyElement(fromElement.type) && toElementId !== RIGHT_RAIL_ID) ||
        wouldCreateCycle(rung, fromElementId, toElementId)
      ) {
        return cloneRung(rung)
      }

      return {
        ...cloneRung(rung),
        connections: [
          ...rung.connections.map((connection) => ({ ...connection })),
          {
            id: createId('connection'),
            fromElementId,
            toElementId,
          },
        ],
      }
    }),
  }
}

export function removeConnection(
  project: Project,
  rungId: string,
  connectionId: string,
): Project {
  return {
    ...project,
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      return {
        ...rung,
        elements: rung.elements.map(cloneElement),
        connections: rung.connections
          .filter((connection) => connection.id !== connectionId)
          .map((connection) => ({ ...connection })),
      }
    }),
  }
}

export function addElementsToRung(
  project: Project,
  rungId: string,
  elements: LadderElement[],
  connections: Connection[],
): Project {
  return {
    ...project,
    variables: project.variables.map(cloneVariable),
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      return {
        ...cloneRung(rung),
        elements: [...rung.elements.map(cloneElement), ...elements.map(cloneElement)],
        connections: [
          ...rung.connections.map((connection) => ({ ...connection })),
          ...connections.map((connection) => ({ ...connection })),
        ],
      }
    }),
  }
}

export function resetSimulationProject(project: Project): Project {
  return {
    ...project,
    variables: project.variables.map((variable) => {
      if (variable.type === 'TIMER') {
        return {
          ...variable,
          value: false,
          elapsedMs: 0,
          done: false,
          previousInput: false,
        }
      }

      if (variable.type === 'COUNTER') {
        return {
          ...variable,
          value: false,
          count: 0,
          done: false,
          previousInput: false,
        }
      }

      if (variable.address.startsWith('%Q') || variable.address.startsWith('%M')) {
        return { ...variable, value: false }
      }

      return { ...variable }
    }),
    rungs: project.rungs.map(cloneRung),
  }
}

export function connectionEndpointExists(rung: Rung, elementId: string) {
  return (
    isRailId(elementId) ||
    rung.elements.some((element) => element.id === elementId)
  )
}
