/**
 * 오류 제보 링크 (Google Form 미리 채워진 링크).
 * VITE_REPORT_FORM_URL 안의 {placeId} 자리에 장소 ID를 넣는다. 값이 없으면 null.
 */
export function reportUrl(placeId: string): string | null {
  const template = import.meta.env.VITE_REPORT_FORM_URL?.trim();
  if (!template) return null;
  return template.replaceAll('{placeId}', encodeURIComponent(placeId));
}
