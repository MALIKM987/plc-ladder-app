import { LEFT_RAIL_ID, RIGHT_RAIL_ID } from '../constants/rails'
import {
  isCounterElement,
  isOutputOnlyElement,
  isTimerElement,
} from '../project/projectActions'
import type { LadderElement, Project, Rung, Variable } from '../types/project'

type ExportContext = {
  variablesById: Map<string, Variable>
  emittedBlocks: Set<string>
  blockLines: string[]
  todoLines: string[]
  memo: Map<string, string>
  visiting: Set<string>
}

function sanitizeName(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_') || 'Var'

  return /^[a-zA-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`
}

function escapeComment(value: string) {
  return value.replace(/\*\)/g, '* )')
}

function getVariableName(context: ExportContext, variableId: string) {
  const variable = context.variablesById.get(variableId)

  return sanitizeName(variable?.name ?? variableId)
}

function getElement(rung: Rung, elementId: string) {
  return rung.elements.find((element) => element.id === elementId)
}

function joinOr(expressions: string[]) {
  const meaningfulExpressions = expressions.filter(
    (expression) => expression !== 'FALSE',
  )

  if (meaningfulExpressions.length === 0) {
    return 'FALSE'
  }

  if (meaningfulExpressions.length === 1) {
    return meaningfulExpressions[0]
  }

  return meaningfulExpressions.join(' OR ')
}

function joinAnd(leftExpression: string, rightExpression: string) {
  if (leftExpression === 'FALSE' || rightExpression === 'FALSE') {
    return 'FALSE'
  }

  if (leftExpression === 'TRUE') {
    return rightExpression
  }

  if (rightExpression === 'TRUE') {
    return leftExpression
  }

  return `${leftExpression} AND ${rightExpression}`
}

function getInputExpression(
  element: LadderElement,
  rung: Rung,
  context: ExportContext,
) {
  const incomingConnections = rung.connections.filter(
    (connection) => connection.toElementId === element.id,
  )
  const expressions = incomingConnections.map((connection) => {
    if (connection.fromElementId === LEFT_RAIL_ID) {
      return 'TRUE'
    }

    return getElementExpression(connection.fromElementId, rung, context)
  })

  return joinOr(expressions)
}

function emitTimerOrCounter(
  element: LadderElement,
  inputExpression: string,
  context: ExportContext,
) {
  if (context.emittedBlocks.has(element.id)) {
    return
  }

  const variable = context.variablesById.get(element.variableId)
  const variableName = getVariableName(context, element.variableId)

  if (isTimerElement(element.type)) {
    const presetMs = variable?.presetMs ?? 1000

    context.blockLines.push(
      `${variableName}(IN := ${inputExpression}, PT := T#${presetMs}ms);`,
    )
  }

  if (element.type === 'CTU') {
    context.blockLines.push(
      `${variableName}(CU := ${inputExpression}, PV := ${variable?.preset ?? 3});`,
    )
  }

  if (element.type === 'CTD') {
    context.blockLines.push(
      `${variableName}(CD := ${inputExpression}, PV := ${variable?.preset ?? 3});`,
    )
  }

  context.emittedBlocks.add(element.id)
}

function getElementExpression(
  elementId: string,
  rung: Rung,
  context: ExportContext,
): string {
  if (context.memo.has(elementId)) {
    return context.memo.get(elementId) ?? 'FALSE'
  }

  if (context.visiting.has(elementId)) {
    context.todoLines.push(
      `(* TODO: Pominięto cykl w szczeblu ${rung.number}. *)`,
    )
    return 'FALSE'
  }

  const element = getElement(rung, elementId)

  if (!element) {
    context.todoLines.push(
      `(* TODO: Pominięto brakujący element w szczeblu ${rung.number}. *)`,
    )
    return 'FALSE'
  }

  context.visiting.add(elementId)

  const inputExpression = getInputExpression(element, rung, context)
  const variableName = getVariableName(context, element.variableId)
  let expression = inputExpression

  if (element.type === 'NO_CONTACT') {
    expression = joinAnd(inputExpression, variableName)
  }

  if (element.type === 'NC_CONTACT') {
    expression = joinAnd(inputExpression, `NOT ${variableName}`)
  }

  if (isTimerElement(element.type) || isCounterElement(element.type)) {
    emitTimerOrCounter(element, inputExpression, context)
    expression = `${variableName}.Q`
  }

  context.visiting.delete(elementId)
  context.memo.set(elementId, expression)

  return expression
}

function exportRung(rung: Rung, context: ExportContext) {
  const lines: string[] = []
  const bodyLines: string[] = []
  const header = rung.title?.trim()
    ? `(* Rung ${rung.number}: ${escapeComment(rung.title.trim())} *)`
    : `(* Rung ${rung.number} *)`

  lines.push(header)

  if (rung.comment?.trim()) {
    lines.push(`(* ${escapeComment(rung.comment.trim())} *)`)
  }

  for (const element of rung.elements) {
    const drivesRightRail = rung.connections.some(
      (connection) =>
        connection.fromElementId === element.id &&
        connection.toElementId === RIGHT_RAIL_ID,
    )

    if (!isOutputOnlyElement(element.type) && !drivesRightRail) {
      continue
    }

    const inputExpression = getInputExpression(element, rung, context)
    const variableName = getVariableName(context, element.variableId)

    if (element.type === 'COIL') {
      bodyLines.push(`${variableName} := ${inputExpression};`)
      continue
    }

    if (element.type === 'SET_COIL') {
      bodyLines.push(`IF ${inputExpression} THEN ${variableName} := TRUE; END_IF;`)
      continue
    }

    if (element.type === 'RESET_COIL') {
      bodyLines.push(`IF ${inputExpression} THEN ${variableName} := FALSE; END_IF;`)
      continue
    }

    if (isTimerElement(element.type) || isCounterElement(element.type)) {
      getElementExpression(element.id, rung, context)
      continue
    }

    context.todoLines.push(
      `(* TODO: Nieobsługiwany element ${element.type} w szczeblu ${rung.number}. *)`,
    )
  }

  if (
    context.blockLines.length === 0 &&
    bodyLines.length === 0 &&
    context.todoLines.length === 0
  ) {
    context.todoLines.push(
      `(* TODO: Szczebel ${rung.number} nie ma eksportowalnego wyjścia. *)`,
    )
  }

  return [
    ...lines,
    ...context.todoLines,
    ...context.blockLines,
    ...bodyLines,
  ].join('\n')
}

function formatVariableComment(variable: Variable) {
  const name = sanitizeName(variable.name)
  const base = `${variable.type} ${name} AT ${variable.address}`

  if (variable.type === 'TIMER') {
    return `(* ${base}; PT=${variable.presetMs ?? 1000}ms; ET=${variable.elapsedMs ?? 0}ms; Q=${Boolean(variable.done).toString().toUpperCase()} *)`
  }

  if (variable.type === 'COUNTER') {
    return `(* ${base}; PV=${variable.preset ?? 3}; CV=${variable.count ?? 0}; Q=${Boolean(variable.done).toString().toUpperCase()} *)`
  }

  return `(* ${base}; VALUE=${Boolean(variable.value).toString().toUpperCase()} *)`
}

export function exportProjectToStructuredText(project: Project) {
  const variablesById = new Map(
    project.variables.map((variable) => [variable.id, variable]),
  )
  const timestamp = new Date().toISOString()
  const header = [
    `(* PLC Ladder Studio Structured Text export *)`,
    `(* Project: ${escapeComment(project.name)} *)`,
    `(* Generated: ${timestamp} *)`,
    `(* Educational simulator output - review before using anywhere else. *)`,
    '',
    `(* Variables *)`,
    ...project.variables.map(formatVariableComment),
  ]

  const rungExports = project.rungs.map((rung) =>
    exportRung(rung, {
      variablesById,
      emittedBlocks: new Set(),
      blockLines: [],
      todoLines: [],
      memo: new Map(),
      visiting: new Set(),
    }),
  )

  return [...header, '', ...rungExports].join('\n')
}
