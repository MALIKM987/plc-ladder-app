import { Handle, Position, type NodeProps } from 'reactflow'
import type { ElementType } from '../types/project'

export type LadderNodeData = {
  elementType: ElementType
  variableName: string
  isActive: boolean
  isInputToggleable: boolean
  inputToggleTitle?: string
  timerPresetMs?: number
  timerElapsedMs?: number
  timerDone?: boolean
  counterPreset?: number
  counterCount?: number
  counterDone?: boolean
}

function getNodeLabel(type: ElementType, variableName: string) {
  if (type === 'NC_CONTACT') {
    return `|/| ${variableName}`
  }

  if (type === 'COIL') {
    return `( ) ${variableName}`
  }

  if (type === 'SET_COIL') {
    return `(S) ${variableName}`
  }

  if (type === 'RESET_COIL') {
    return `(R) ${variableName}`
  }

  if (type === 'TON' || type === 'TOF' || type === 'TP') {
    return `${type} ${variableName}`
  }

  if (type === 'CTU' || type === 'CTD') {
    return `${type} ${variableName}`
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
    data.isInputToggleable ? 'ladder-flow-node--input-toggleable' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const timerNode =
    data.elementType === 'TON' ||
    data.elementType === 'TOF' ||
    data.elementType === 'TP'
  const counterNode =
    data.elementType === 'CTU' || data.elementType === 'CTD'

  return (
    <div
      className={className}
      data-testid={`ladder-node-${id}`}
      title={data.inputToggleTitle}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <span className="ladder-flow-node__label">
        {getNodeLabel(data.elementType, data.variableName)}
      </span>
      {timerNode && (
        <span className="ladder-flow-node__details">
          <span>PT: {data.timerPresetMs ?? 0}ms</span>
          <span>ET: {data.timerElapsedMs ?? 0}ms</span>
          <span>Q: {data.timerDone ? 'TRUE' : 'FALSE'}</span>
        </span>
      )}
      {counterNode && (
        <span className="ladder-flow-node__details">
          <span>PV: {data.counterPreset ?? 0}</span>
          <span>CV: {data.counterCount ?? 0}</span>
          <span>Q: {data.counterDone ? 'TRUE' : 'FALSE'}</span>
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
