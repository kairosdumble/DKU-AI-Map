/** B2 < B1 < 1F < 2F 순서가 되도록 숫자로 바꾼다 */
export function floorRank(floor: string): number {
  const basement = /^B(\d+)$/.exec(floor);
  if (basement) return -Number(basement[1]);
  return Number.parseInt(floor, 10);
}

export function sortFloors(floors: Iterable<string>): string[] {
  return [...new Set(floors)].sort((a, b) => floorRank(a) - floorRank(b));
}

/** 'B1' → '지하 1층', '2F' → '2층' */
export function floorLabel(floor: string): string {
  const rank = floorRank(floor);
  return rank < 0 ? `지하 ${-rank}층` : `${rank}층`;
}
