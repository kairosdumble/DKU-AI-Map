import { PlacesFileSchema, formatIssues } from './schema';
import type { PlacesData } from './schema';

/** public/data/places.json 을 불러와 스키마로 검증한다. 검증 실패 시 throw. */
export async function loadPlacesData(signal?: AbortSignal): Promise<PlacesData> {
  const res = await fetch('/data/places.json', { signal, cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`places.json을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const json: unknown = await res.json();
  const parsed = PlacesFileSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`places.json 형식 오류\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}
