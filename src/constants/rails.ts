export const LEFT_RAIL_ID = '__LEFT_RAIL__'
export const RIGHT_RAIL_ID = '__RIGHT_RAIL__'

export function isRailId(elementId: string) {
  return elementId === LEFT_RAIL_ID || elementId === RIGHT_RAIL_ID
}
