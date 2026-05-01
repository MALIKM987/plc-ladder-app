import type { Project, Rung } from '../types/project'

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

function validateRungConnections(rung: Rung): ValidationIssue[] {
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
  const startElements = rung.elements.filter(
    (element) => (incomingByElementId.get(element.id)?.length ?? 0) === 0,
  )

  if (rung.elements.length > 0 && startElements.length === 0) {
    issues.push({
      id: `rung-${rung.id}-missing-start`,
      severity: 'error',
      message: `Szczebel ${rung.number} nie ma elementu początkowego.`,
    })
  }

  for (const element of rung.elements) {
    const incomingCount = incomingByElementId.get(element.id)?.length ?? 0
    const outgoingCount = outgoingByElementId.get(element.id)?.length ?? 0

    if (incomingCount > 1) {
      issues.push({
        id: `element-${element.id}-multiple-incoming`,
        severity: 'error',
        message: `Element ${element.id} ma więcej niż jedno połączenie wejściowe.`,
      })
    }

    if (outgoingCount > 1) {
      issues.push({
        id: `element-${element.id}-multiple-outgoing`,
        severity: 'error',
        message: `Element ${element.id} ma więcej niż jedno połączenie wyjściowe.`,
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
        message: `Element ${element.id} nie ma połączeń w środku szczebla.`,
      })
    }
  }

  if (hasCycle(rung)) {
    issues.push({
      id: `rung-${rung.id}-cycle`,
      severity: 'error',
      message: `Szczebel ${rung.number} zawiera cykl w grafie połączeń.`,
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
    const hasCoil = rung.elements.some((element) => element.type === 'COIL')

    if (!hasCoil) {
      issues.push({
        id: `rung-${rung.id}-missing-coil`,
        severity: 'warning',
        message: `Szczebel ${rung.number} nie zawiera cewki.`,
      })
    }

    issues.push(...validateRungConnections(rung))

    for (const element of rung.elements) {
      const variable = variablesById.get(element.variableId)

      if (!variable) {
        issues.push({
          id: `element-${element.id}-missing-variable`,
          severity: 'error',
          message: `Brak zmiennej dla elementu ${element.id} w szczeblu ${rung.number}.`,
        })
      }

      if (element.type === 'COIL' && !variable) {
        issues.push({
          id: `coil-${element.id}-missing-variable`,
          severity: 'error',
          message: `Cewka ${element.id} nie ma przypisanej zmiennej.`,
        })
      }
    }
  }

  return issues
}
