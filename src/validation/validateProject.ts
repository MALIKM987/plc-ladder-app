import { LEFT_RAIL_ID, RIGHT_RAIL_ID, isRailId } from '../constants/rails'
import {
  getRequiredVariableType,
  isCounterElement,
  isOutputOnlyElement,
  isTimerElement,
} from '../project/projectActions'
import type { LadderElement, Project, Rung, Variable } from '../types/project'

export type ValidationIssue = {
  id: string
  severity: 'error' | 'warning'
  message: string
}

const BOOL_ADDRESS_PATTERN = /^%[IQM]\d+\.\d+$/
const TIMER_ADDRESS_PATTERN = /^%T\d+$/
const COUNTER_ADDRESS_PATTERN = /^%C\d+$/

function getDuplicateValues(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
}

function getVariableLabel(variable?: Variable) {
  return variable ? `${variable.name} (${variable.address})` : 'brak zmiennej'
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

  return `${element.type} #${elementNumber} (${getVariableLabel(variable)})`
}

function endpointExists(rung: Rung, elementId: string) {
  return (
    isRailId(elementId) ||
    rung.elements.some((element) => element.id === elementId)
  )
}

function buildOutgoingMap(rung: Rung) {
  const outgoingByElementId = new Map<string, string[]>()

  outgoingByElementId.set(LEFT_RAIL_ID, [])
  outgoingByElementId.set(RIGHT_RAIL_ID, [])

  for (const element of rung.elements) {
    outgoingByElementId.set(element.id, [])
  }

  for (const connection of rung.connections) {
    outgoingByElementId
      .get(connection.fromElementId)
      ?.push(connection.toElementId)
  }

  return outgoingByElementId
}

function getReachableFromLeft(rung: Rung) {
  const outgoingByElementId = buildOutgoingMap(rung)
  const reachable = new Set<string>()
  const stack = [LEFT_RAIL_ID]

  while (stack.length > 0) {
    const current = stack.pop()

    if (!current || reachable.has(current)) {
      continue
    }

    reachable.add(current)
    stack.push(...(outgoingByElementId.get(current) ?? []))
  }

  return reachable
}

function hasPathToRight(rung: Rung, startElementId: string) {
  const outgoingByElementId = buildOutgoingMap(rung)
  const visited = new Set<string>()
  const stack = [startElementId]

  while (stack.length > 0) {
    const current = stack.pop()

    if (!current || visited.has(current)) {
      continue
    }

    if (current === RIGHT_RAIL_ID) {
      return true
    }

    visited.add(current)
    stack.push(...(outgoingByElementId.get(current) ?? []))
  }

  return false
}

function hasCycle(rung: Rung) {
  const outgoingByElementId = buildOutgoingMap(rung)
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

  return [LEFT_RAIL_ID, ...rung.elements.map((element) => element.id)].some(
    (elementId) => visit(elementId),
  )
}

function validateVariable(variable: Variable): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!variable.name.trim()) {
    issues.push({
      id: `variable-${variable.id}-empty-name`,
      severity: 'error',
      message: 'Zmienna ma pusta nazwe.',
    })
  }

  if (!variable.address.trim()) {
    issues.push({
      id: `variable-${variable.id}-empty-address`,
      severity: 'error',
      message: `Zmienna ${variable.name} ma pusty adres.`,
    })
  }

  const validAddress =
    (variable.type === 'BOOL' && BOOL_ADDRESS_PATTERN.test(variable.address)) ||
    (variable.type === 'TIMER' &&
      TIMER_ADDRESS_PATTERN.test(variable.address)) ||
    (variable.type === 'COUNTER' &&
      COUNTER_ADDRESS_PATTERN.test(variable.address))

  if (variable.address.trim() && !validAddress) {
    issues.push({
      id: `variable-${variable.id}-invalid-address`,
      severity: 'error',
      message: `Zmienna ${variable.name} ma bledny format adresu: ${variable.address}.`,
    })
  }

  return issues
}

function validateRungConnections(
  rung: Rung,
  variablesById: Map<string, Variable>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const duplicateConnections = new Set<string>()
  const seenConnections = new Set<string>()
  const reachableFromLeft = getReachableFromLeft(rung)

  for (const connection of rung.connections) {
    const key = `${connection.fromElementId}->${connection.toElementId}`

    if (!endpointExists(rung, connection.fromElementId)) {
      issues.push({
        id: `connection-${connection.id}-missing-source`,
        severity: 'error',
        message: `Szczebel ${rung.number}: polaczenie ma nieistniejace zrodlo.`,
      })
    }

    if (!endpointExists(rung, connection.toElementId)) {
      issues.push({
        id: `connection-${connection.id}-missing-target`,
        severity: 'error',
        message: `Szczebel ${rung.number}: polaczenie ma nieistniejacy cel.`,
      })
    }

    if (connection.fromElementId === connection.toElementId) {
      issues.push({
        id: `connection-${connection.id}-self-loop`,
        severity: 'error',
        message: `Szczebel ${rung.number}: polaczenie nie moze wracac do tego samego punktu.`,
      })
    }

    if (seenConnections.has(key)) {
      duplicateConnections.add(key)
    }

    seenConnections.add(key)
  }

  for (const duplicateConnection of duplicateConnections) {
    issues.push({
      id: `duplicate-connection-${rung.id}-${duplicateConnection}`,
      severity: 'error',
      message: `Szczebel ${rung.number}: duplikat polaczenia ${duplicateConnection}.`,
    })
  }

  for (const element of rung.elements) {
    const variable = variablesById.get(element.variableId)
    const elementLabel = getElementLabel(element, rung, variablesById)
    const outgoingConnections = rung.connections.filter(
      (connection) => connection.fromElementId === element.id,
    )

    if (!reachableFromLeft.has(element.id)) {
      issues.push({
        id: `element-${element.id}-not-powered`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: ${elementLabel} nie jest podlaczony do lewej szyny zasilania.`,
      })
    }

    if (
      (isOutputOnlyElement(element.type) ||
        isTimerElement(element.type) ||
        isCounterElement(element.type)) &&
      !hasPathToRight(rung, element.id)
    ) {
      issues.push({
        id: `element-${element.id}-no-right-rail`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: wyjscie ${elementLabel} nie jest podlaczone do prawej szyny.`,
      })
    }

    if (
      isOutputOnlyElement(element.type) &&
      outgoingConnections.some(
        (connection) => connection.toElementId !== RIGHT_RAIL_ID,
      )
    ) {
      issues.push({
        id: `element-${element.id}-output-drives-element`,
        severity: 'error',
        message: `Szczebel ${rung.number}: ${element.type} nie moze sterowac kolejnym elementem.`,
      })
    }

    if (!variable) {
      issues.push({
        id: `element-${element.id}-missing-variable`,
        severity: 'error',
        message: `Szczebel ${rung.number}: ${elementLabel} nie ma przypisanej zmiennej.`,
      })
      continue
    }

    const requiredVariableType = getRequiredVariableType(element.type)

    if (variable.type !== requiredVariableType) {
      issues.push({
        id: `element-${element.id}-invalid-variable-type`,
        severity: 'error',
        message: `Szczebel ${rung.number}: ${elementLabel} wymaga zmiennej ${requiredVariableType}.`,
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

  for (const variable of project.variables) {
    issues.push(...validateVariable(variable))
  }

  for (const duplicateName of getDuplicateValues(
    project.variables.map((variable) => variable.name).filter(Boolean),
  )) {
    issues.push({
      id: `duplicate-variable-name-${duplicateName}`,
      severity: 'error',
      message: `Duplikat nazwy zmiennej: ${duplicateName}.`,
    })
  }

  for (const duplicateAddress of getDuplicateValues(
    project.variables.map((variable) => variable.address).filter(Boolean),
  )) {
    issues.push({
      id: `duplicate-variable-address-${duplicateAddress}`,
      severity: 'error',
      message: `Duplikat adresu zmiennej: ${duplicateAddress}.`,
    })
  }

  for (const rung of project.rungs) {
    const outputCount = rung.elements.filter(
      (element) =>
        isOutputOnlyElement(element.type) ||
        isTimerElement(element.type) ||
        isCounterElement(element.type),
    ).length

    if (outputCount === 0) {
      issues.push({
        id: `rung-${rung.id}-missing-output`,
        severity: 'warning',
        message: `Szczebel ${rung.number}: brak cewki albo bloku wyjsciowego.`,
      })
    }

    issues.push(...validateRungConnections(rung, variablesById))
  }

  return issues
}
