/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 오류 제보 Google Form 미리 채워진 링크. {placeId} 자리에 장소 ID가 들어간다 */
  readonly VITE_REPORT_FORM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
