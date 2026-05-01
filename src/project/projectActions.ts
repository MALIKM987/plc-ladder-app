import type { ElementType, Project, Rung } from '../types/project'

const ELEMENT_SPACING = 150
const FIRST_ELEMENT_X = 120

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneRung(rung: Rung): Rung {
  return {
    ...rung,
    elements: rung.elements.map((element) => ({
      ...element,
      position: { ...element.position },
    })),
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

      return {
        ...cloneRung(rung),
        elements: [
          ...rung.elements.map((element) => ({
            ...element,
            position: { ...element.position },
          })),
          {
            id: createId('element'),
            type,
            variableId: defaultVariableId,
            position: {
              x: getNextElementX(rung),
              y: 0,
            },
          },
        ],
      }
    }),
  }
}

export function removeElement(
  project: Project,
  rungId: string,
  elementId: string,
): Project {
  return {
    ...project,
    rungs: project.rungs.map((rung) => {
      if (rung.id !== rungId) {
        return cloneRung(rung)
      }

      return {
        ...rung,
        elements: rung.elements
          .filter((element) => element.id !== elementId)
          .map((element) => ({
            ...element,
            position: { ...element.position },
          })),
        connections: rung.connections
          .filter(
            (connection) =>
              connection.fromElementId !== elementId &&
              connection.toElementId !== elementId,
          )
          .map((connection) => ({ ...connection })),
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
          : {
              ...element,
              position: { ...element.position },
            },
      ),
      connections: rung.connections.map((connection) => ({ ...connection })),
    })),
  }
}
