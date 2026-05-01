export interface SimulationState {
  activeElementIds: string[]
  activeConnectionIds: string[]
  coilValues: Record<string, boolean>
  elementSignals: Record<string, boolean>
  connectionSignals: Record<string, boolean>
  breakpointRungId?: string
}
