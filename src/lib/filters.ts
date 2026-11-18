import type { AmenitySubcategory, Category, Place, Source, StudySubcategory } from './schema';

/** 필터 칩 ID: 화장실은 category, 나머지는 subcategory 값 그대로 */
export type FilterId = 'restroom' | AmenitySubcategory | StudySubcategory;

/** 필터 버튼 표시 순서 (PRD 4장 subcategory 표 순서, 화장실은 맨 앞) */
export const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'restroom', label: '화장실' },
  { id: 'atm', label: 'ATM' },
  { id: 'convenience_store', label: '편의점' },
  { id: 'umbrella', label: '우산대여' },
  { id: 'gym', label: '헬스장' },
  { id: 'vending', label: '자판기' },
  { id: 'printer', label: '프린터·복사' },
  { id: 'stationery', label: '문구점' },
  { id: 'etc', label: '기타 편의' },
  { id: 'reading_room', label: '열람실' },
  { id: 'study_room', label: '스터디룸' },
  { id: 'lounge', label: '라운지' },
];

export const FILTER_LABEL = Object.fromEntries(FILTERS.map((f) => [f.id, f.label])) as Record<FilterId, string>;

export const CATEGORY_LABEL: Record<Category, string> = {
  restroom: '화장실',
  amenity: '편의시설',
  study: '학습공간',
};

export const SOURCE_LABEL: Record<Source, string> = {
  field: '현장 확인',
  website: '학교 홈페이지',
  notice: '게시물',
};

export function matchesFilter(place: Place, filter: FilterId): boolean {
  return filter === 'restroom' ? place.category === 'restroom' : place.subcategory === filter;
}

/** 카드·목록에 쓰는 시설 종류 이름 */
export function placeKindLabel(place: Place): string {
  return place.subcategory ? FILTER_LABEL[place.subcategory] : CATEGORY_LABEL[place.category];
}
