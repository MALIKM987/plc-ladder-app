import type { LadderElement, Project, Rung, Variable } from '../types/project'

export type ValidationIssue = {
  id: string
  severity: 'error' | 'warning'
  message: string
}

function getDuplicateValues(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
}

function getElementLabel(
  element: LadderElement,
  rung: Rung,
  variablesById: Map<string, Variable>,
) {
  const sortedElements = [...rung.elements].sort(
    (first, second) => first.position.x - second.position.x,
  )
  const elementNumber =
    sortedElements.findIndex((candidate) => candidate.id === element.id) + 1
  const variable = variablesById.get(element.variableId)
  const variableLabel = variable ? ` "${variable.name}"` : ''

  return `${element.type}${variableLabel} (#${elementNumber})`
}

function hasCycle(rung: Rung) {
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
  const visiting = new Set<string>()

  const visit = (elementId: string): boolean => {
    if (visiting.has(elementId)) {
      return true
    }

    if (visited.has(elementId)) {
      return false
    }

    visiting.add(elementId)

    for (const nextElementId of outgoingByElementId.get(elementId) ?? []) {
      if (visit(nextElementId)) {
        return true
      }
    }

    visiting.delete(elementId)
    visited.add(elementId)
    return false
  }

  return rung.elements.some((element) => visit(element.id))
}

function validateRungConnections(
  rung: Rung,
  variablesById: Map<string, Variable>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const incomingByElementId = new Map<string, string[]>()
  const outgoingByElementId = new Map<string, string[]>()

  for (const element of rung.elements) {
    incomingByElementId.set(element.id, [])
    outgoingByElementId.set(element.id, [])
  }

  for (const connection of rung.connections) {
    incomingByElementId
      .get(connection.toElementId)
      ?.push(connection.fromElementId)
    outgoingByElementId
      .get(connection.fromElementId)
      ?.push(connection.toElementId)
  }

  const elementsByPosition = [...rung.elements].sort(
    (first, second) => first.position.x - second.position.x,
  )
  const firstElementId = elementsByPosition[0]?.id
  const lastElementId = elementsByPosition[elementsByPosition.length - 1]?.id
  const elementOrderById = new Map(
    elementsByPosition.map((element, index) => [element.id, index + 1]),
  )
  const startElements = rung.elements.filter(
    (element) => (incomingByElementId.get(element.id)?.length ?? 0) === 0,
  )
  const hasCoil = rung.elements.some((element) => element.type === 'COIL')

  if (rung.elements.length > 0 && startElements.length === 0) {
    issues.push({
      id: `rung-${rung.id}-missing-start`,
      severity: 'error',
      message: `Szczebel ${rung.number}: brak elementu poczatkowego.`,
    })
  }

  for (const element of rung.elements) {
    const incomingCount = incomingByElementId.get(element.id)?.length ?? 0
    const outgoingCount = outgoingByElementId.get(element.id)?.length ?? 0
    const elementLabel = getElementLabel(element, rung, variablesById)

    if (element.type === 'COIL' && outgoingCount > 0) {
      issues.push({
        id: `coil-${element.id}-has-output`,
        severity: 'error',
        message: `Szczebel ${rung.number}: cewka ${elementLabel} nie moze sterowac kolejnym elementem.`,
      })
    }

    if (
      (element.type === 'NO_CONTACT' || element.type === 'NC_CONTACT') &&
      hasCoil &&
      outgoingCount === 0
    ) {
      issues.push({
        id: `contact-${element.id}-not-connected-to-coil`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: kontakt ${elementLabel} nie jest polaczony z cewka.`,
      })
    }

    if (
      rung.elements.length > 2 &&
      element.id !== firstElementId &&
      element.id !== lastElementId &&
      incomingCount === 0 &&
      outgoingCount === 0
    ) {
      issues.push({
        id: `element-${element.id}-disconnected`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: element #${elementOrderById.get(element.id)} nie ma polaczen.`,
      })
    }
  }

  if (hasCycle(rung)) {
    issues.push({
      id: `rung-${rung.id}-cycle`,
      severity: 'error',
      message: `Szczebel ${rung.number}: graf polaczen zawiera cykl.`,
    })
  }

  return issues
}

export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const variablesById = new Map(
    project.variables.map((variable) => [variable.id, variable]),
  )

  for (const duplicateName of getDuplicateValues(
    project.variables.map((variable) => variable.name),
  )) {
    issues.push({
      id: `duplicate-variable-name-${duplicateName}`,
      severity: 'error',
      message: `Duplikat nazwy zmiennej: ${duplicateName}.`,
    })
  }

  for (const duplicateAddress of getDuplicateValues(
    project.variables.map((variable) => variable.address),
  )) {
    issues.push({
      id: `duplicate-variable-address-${duplicateAddress}`,
      severity: 'error',
      message: `Duplikat adresu zmiennej: ${duplicateAddress}.`,
    })
  }

  for (const rung of project.rungs) {
    const coilCount = rung.elements.filter(
      (element) => element.type === 'COIL',
    ).length
    const outputCount = rung.elements.filter(
      (element) => element.type === 'COIL' || element.type === 'TON',
    ).length

    if (outputCount === 0) {
      issues.push({
        id: `rung-${rung.id}-missing-output`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: brak cewki albo bloku wyjsciowego.`,
      })
    }

    if (coilCount > 1) {
      issues.push({
        id: `rung-${rung.id}-multiple-coils`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: wiecej niz jedna cewka.`,
      })
    }

    issues.push(...validateRungConnections(rung, variablesById))

    for (const element of rung.elements) {
      const variable = variablesById.get(element.variableId)
      const elementLabel = getElementLabel(element, rung, variablesById)

      if (!variable) {
        issues.push({
          id: `element-${element.id}-missing-variable`,
          severity: 'error',
          message: `Szczebel ${rung.number}: element ${elementLabel} nie ma przypisanej zmiennej.`,
        })
      }

      if (element.type === 'COIL' && !variable) {
        issues.push({
          id: `coil-${element.id}-missing-variable`,
          severity: 'error',
          message: `Szczebel ${rung.number}: cewka nie ma przypisanej zmiennej.`,
        })
      }

      if (
        variable &&
        (element.type === 'NO_CONTACT' || element.type === 'NC_CONTACT') &&
        variable.type !== 'BOOL'
      ) {
        issues.push({
          id: `contact-${element.id}-invalid-variable-type`,
          severity: 'error',
          message: `Szczebel ${rung.number}: styk ${elementLabel} musi uzywac zmiennej BOOL.`,
        })
      }

      if (variable && element.type === 'COIL' && variable.type !== 'BOOL') {
        issues.push({
          id: `coil-${element.id}-invalid-variable-type`,
          severity: 'error',
          message: `Szczebel ${rung.number}: cewka ${elementLabel} musi uzywac zmiennej BOOL.`,
        })
      }

      if (variable && element.type === 'TON' && variable.type !== 'TIMER') {
        issues.push({
          id: `ton-${element.id}-invalid-variable-type`,
          severity: 'error',
          message: `Szczebel ${rung.number}: TON ${elementLabel} musi uzywac zmiennej TIMER.`,
        })
      }
    }
  }

  return issues
}
