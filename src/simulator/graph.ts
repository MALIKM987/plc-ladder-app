import type { LadderElement, Rung } from '../types/project'

function sortByPosition(elements: LadderElement[]) {
  return [...elements].sort(
    (first, second) => first.position.x - second.position.x,
  )
}

export function getExecutionOrder(rung: Rung): LadderElement[] {
  if (rung.elements.length === 0) {
    return []
  }

  const elementsById = new Map(
    rung.elements.map((element) => [element.id, element]),
  )
  const incomingElementIds = new Set(
    rung.connections.map((connection) => connection.toElementId),
  )
  const outgoingByElementId = new Map(
    rung.connections.map((connection) => [
      connection.fromElementId,
      connection.toElementId,
    ]),
  )
  const firstElement =
    sortByPosition(rung.elements).find(
      (element) => !incomingElementIds.has(element.id),
    ) ?? sortByPosition(rung.elements)[0]

  const orderedElements: LadderElement[] = []
  const visitedElementIds = new Set<string>()
  let currentElement: LadderElement | undefined = firstElement

  while (currentElement && !visitedElementIds.has(currentElement.id)) {
    orderedElements.push(currentElement)
    visitedElementIds.add(currentElement.id)

    const nextElementId = outgoingByElementId.get(currentElement.id)
    currentElement = nextElementId ? elementsById.get(nextElementId) : undefined
  }

  return orderedElements
}
