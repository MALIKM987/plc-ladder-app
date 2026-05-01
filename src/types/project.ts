export type ElementType = 'NO_CONTACT' | 'NC_CONTACT' | 'COIL'

export interface Variable {
  id: string
  name: string
  address: string
  type: 'BOOL'
  value: boolean
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
}

export interface Project {
  id: string
  name: string
  version: string
  variables: Variable[]
  rungs: Rung[]
}
