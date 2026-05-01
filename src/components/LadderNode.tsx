import { Handle, Position, type NodeProps } from 'reactflow'
import type { ElementType } from '../types/project'

export type LadderNodeData = {
  elementType: ElementType
  variableName: string
}

function getNodeLabel(type: ElementType, variableName: string) {
  if (type === 'NC_CONTACT') {
    return `|/| ${variableName}`
  }

  if (type === 'COIL') {
    return `( ) ${variableName}`
  }

  return `| | ${variableName}`
}

export function LadderNode({
  data,
  id,
  isConnectable,
  selected,
}: NodeProps<LadderNodeData>) {
  return (
    <div
      className={`ladder-flow-node ${selected ? 'ladder-flow-node--selected' : ''}`}
      data-testid={`ladder-node-${id}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <span>{getNodeLabel(data.elementType, data.variableName)}</span>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  )
}
