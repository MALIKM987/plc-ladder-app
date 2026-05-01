export type ElementType =
  | 'NO_CONTACT'
  | 'NC_CONTACT'
  | 'COIL'
  | 'TON'
  | 'TOF'
  | 'TP'
  | 'CTU'
  | 'CTD'
  | 'SET_COIL'
  | 'RESET_COIL'

export type VariableType = 'BOOL' | 'TIMER' | 'COUNTER'

export interface Variable {
  id: string
  name: string
  address: string
  type: VariableType
  value: boolean
  presetMs?: number
  elapsedMs?: number
  preset?: number
  count?: number
  done?: boolean
  previousInput?: boolean
}

export interface LadderElement {
  id: string
  type: ElementType
  variableId: string
  position: {
    x: number
    y: number
  }
}

export interface Connection {
  id: string
  fromElementId: string
  toElementId: string
}

export interface Rung {
  id: string
  number: number
  elements: LadderElement[]
  connections: Connection[]
  title?: string
  comment?: string
  breakpoint?: boolean
}

export interface Project {
  id: string
  name: string
  version: string
  variables: Variable[]
  rungs: Rung[]
}
