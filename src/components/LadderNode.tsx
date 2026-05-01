import { Handle, Position, type NodeProps } from 'reactflow'
import type { ElementType } from '../types/project'

export type LadderNodeData = {
  elementType: ElementType
  variableName: string
  isActive: boolean
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
  const className = [
    'ladder-flow-node',
    selected ? 'ladder-flow-node--selected' : '',
    data.isActive ? 'ladder-flow-node--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
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
