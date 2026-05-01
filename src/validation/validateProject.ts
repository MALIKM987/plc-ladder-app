import type { Project } from '../types/project'

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
