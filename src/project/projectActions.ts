import type { ElementType, LadderElement, Project, Rung } from '../types/project'

const ELEMENT_SPACING = 150
const FIRST_ELEMENT_X = 120

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

export function wouldCreateCycle(
  rung: Rung,
  fromElementId: string,
  toElementId: string,
) {
  if (fromElementId === toElementId) {
    return true
  }

  const outgoingByElementId = new Map<string, string[]>()

  for (const element of rung.elements) {
    outgoingByElementId.set(element.id, [])
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

export function addElement(
  project: Project,
  rungId: string,
  type: ElementType,
): Project {
  const defaultVariableId = project.variables[0]?.id ?? ''

  return {
    ...project,
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      const clonedRung = cloneRung(rung)
      const lastElement = getLastElement(clonedRung)
      const newElement: LadderElement = {
        id: createId('element'),
        type,
        variableId: defaultVariableId,
        position: {
          x: getNextElementX(rung),
          y: 0,
        },
      }

      return {
        ...clonedRung,
        elements: [...clonedRung.elements, newElement],
        connections: lastElement && lastElement.type !== 'COIL'
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
        reconnectFromElement?.type !== 'COIL' &&
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
  return {
    ...project,
    rungs: project.rungs.map((rung) => ({
      ...rung,
      elements: rung.elements.map((element) =>
        element.id === elementId
          ? {
              ...element,
              position: { ...position },
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
  if (fromElementId === toElementId) {
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

      if (
        !fromElement ||
        !toElement ||
        fromElement.type === 'COIL' ||
        connectionExists ||
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
