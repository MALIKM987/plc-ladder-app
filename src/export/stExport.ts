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
  memo: Map<string, string>
  visiting: Set<string>
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_') || 'Var'
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
    return 'FALSE'
  }

  const element = getElement(rung, elementId)

  if (!element) {
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
  const header = rung.title?.trim()
    ? `(* Rung ${rung.number}: ${rung.title.trim()} *)`
    : `(* Rung ${rung.number} *)`

  lines.push(header)

  if (rung.comment?.trim()) {
    lines.push(`(* ${rung.comment.trim()} *)`)
  }

  for (const element of rung.elements) {
    if (
      isOutputOnlyElement(element.type) ||
      rung.connections.some(
        (connection) =>
          connection.fromElementId === element.id &&
          connection.toElementId === RIGHT_RAIL_ID,
      )
    ) {
      const inputExpression = getInputExpression(element, rung, context)
      const variableName = getVariableName(context, element.variableId)

      if (element.type === 'COIL') {
        lines.push(`${variableName} := ${inputExpression};`)
      }

      if (element.type === 'SET_COIL') {
        lines.push(`IF ${inputExpression} THEN ${variableName} := TRUE; END_IF;`)
      }

      if (element.type === 'RESET_COIL') {
        lines.push(`IF ${inputExpression} THEN ${variableName} := FALSE; END_IF;`)
      }

      if (isTimerElement(element.type) || isCounterElement(element.type)) {
        getElementExpression(element.id, rung, context)
      }
    }
  }

  return [...context.blockLines, ...lines].join('\n')
}

export function exportProjectToStructuredText(project: Project) {
  const variablesById = new Map(
    project.variables.map((variable) => [variable.id, variable]),
  )

  return project.rungs
    .map((rung) =>
      exportRung(rung, {
        variablesById,
        emittedBlocks: new Set(),
        blockLines: [],
        memo: new Map(),
        visiting: new Set(),
      }),
    )
    .join('\n\n')
}
