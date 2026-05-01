import { Handle, Position, type NodeProps } from 'reactflow'
import { LEFT_RAIL_ID } from '../constants/rails'

export type RailNodeData = {
  label: string
  side: 'left' | 'right'
}

export function RailNode({ data, id, isConnectable }: NodeProps<RailNodeData>) {
  const leftRail = id === LEFT_RAIL_ID || data.side === 'left'

  return (
    <div className={`rail-node rail-node--${data.side}`}>
      <span>{data.label}</span>
      {leftRail ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
        />
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
        />
      )}
    </div>
  )
}
