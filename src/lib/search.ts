/**
 * 일반 검색창용 즉시 검색 (AI 미사용, PRD 3장 진입 경로 3).
 * 공백으로 나눈 모든 단어가 건물명·별칭·시설명·시설 종류·층 중 어딘가에 포함되면 일치.
 * 예: "도서관 화장실", "1공 자판기", "편의점"
 */
import { CATEGORY_LABEL, placeKindLabel } from './filters';
import { floorLabel } from './floors';
import type { Building, Place, PlacesData } from './schema';

export type SearchResult =
  | { kind: 'building'; building: Building }
  | { kind: 'place'; place: Place; building: Building };

const normalize = (s: string) => s.toLowerCase().replace(/[\s·・\-_()]/g, '');

const matchesAll = (tokens: string[], haystack: string[]) =>
  tokens.every((token) => haystack.some((h) => h.includes(token)));

export function search(data: PlacesData, query: string, limit = 20): SearchResult[] {
  const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  if (tokens.length === 0) return [];

  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  const results: SearchResult[] = [];

  for (const building of data.buildings) {
    const hay = [building.name, ...building.aliases].map(normalize);
    if (matchesAll(tokens, hay)) results.push({ kind: 'building', building });
  }

  for (const place of data.places) {
    const building = buildingsById.get(place.buildingId);
    if (!building) continue;
    const hay = [
      place.name,
      placeKindLabel(place),
      CATEGORY_LABEL[place.category],
      place.floor,
      floorLabel(place.floor),
      building.name,
      ...building.aliases,
      ...place.features,
    ].map(normalize);
    if (matchesAll(tokens, hay)) results.push({ kind: 'place', place, building });
  }

  return results.slice(0, limit);
}
