import { Handle, Position, type NodeProps } from 'reactflow'
import type { ElementType } from '../types/project'

export type LadderNodeData = {
  elementType: ElementType
  variableName: string
  isActive: boolean
  timerPresetMs?: number
  timerElapsedMs?: number
  timerDone?: boolean
}

function getNodeLabel(type: ElementType, variableName: string) {
  if (type === 'NC_CONTACT') {
    return `|/| ${variableName}`
  }

  if (type === 'COIL') {
    return `( ) ${variableName}`
  }

  if (type === 'TON') {
    return `TON ${variableName}`
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
      <span className="ladder-flow-node__label">
        {getNodeLabel(data.elementType, data.variableName)}
      </span>
      {data.elementType === 'TON' && (
        <span className="ladder-flow-node__details">
          <span>PT: {data.timerPresetMs ?? 0}ms</span>
          <span>ET: {data.timerElapsedMs ?? 0}ms</span>
          <span>Q: {data.timerDone ? 'TRUE' : 'FALSE'}</span>
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  )
}
