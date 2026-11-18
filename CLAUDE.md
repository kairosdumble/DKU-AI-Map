# CLAUDE.md — 단국 캠퍼스 가이드

단국대 죽전캠퍼스 신입생용 시설 안내 모바일 웹(PWA). 요구사항의 기준은 **docs/PRD.md** 이며, 작업 전에 해당 섹션을 먼저 읽는다.

## 스택
- React 19 + Vite 7 + TypeScript (strict), 외부 UI 라이브러리 없음
- 지도: 직접 그린 일러스트 이미지. **카카오·네이버 등 외부 지도 API, 학교 공식 지도 이미지 사용 금지**
- 서버: Cloudflare Pages Functions (`functions/api/*.ts` → `/api/*`)
- 데이터 검증: zod (`src/lib/schema.ts`)

## 명령
- `npm run dev` — 화면 개발 (http://localhost:5173)
- `npm run validate` — places.json 스키마 검사 (빌드 전에 자동 실행)
- `npm run typecheck` — 타입 검사
- `npm run build` → `npm run pages:dev` — 함수 포함 로컬 실행 (http://localhost:8788/api/health)

## 폴더
- `src/components/` MapView, BuildingLayer, BuildingSheet, PlaceCard, FilterBar, SearchBar
- `src/lib/` schema(zod), dataLoader, hitTest(알파값 건물 판정), filters(필터·라벨), floors, search, report
- `src/hooks/usePanZoom.ts` 핀치 줌·드래그 (CSS transform)
- `public/data/places.json` 장소 데이터, `public/map/` 지도 이미지
- `functions/api/` 서버 함수, `scripts/validate-data.ts` 데이터 검사

## 코딩 규칙
1. **모바일 360px 우선.** 큰 화면은 나중에 확장. 터치 영역 최소 44px(`--tap`), 글자 대비 4.5:1 이상.
2. **비밀 키는 서버에만.** `.dev.vars`(로컬)·Cloudflare Secret에 두고 함수에서 `context.env`로 읽는다. 서버 키에 `VITE_` 접두사 금지(브라우저 번들에 들어감). `.env*`, `.dev.vars`는 커밋 금지.
3. **데이터 타입은 zod 스키마가 단일 원천.** 타입은 `z.infer`로만 만들고, 따로 interface를 중복 정의하지 않는다. 데이터는 `dataLoader`를 거쳐 검증된 것만 쓴다.
4. **스키마를 바꾸면** PRD 4장 표, `src/lib/filters.ts`(subcategory 라벨·순서), `public/data/places.json`을 함께 고치고 `npm run validate`를 통과시킨다.
5. **좌표는 지도 그림 픽셀(x, y).** 현재 지도 크기는 `meta.map` = 3000×4500. 그림 크기를 바꾸면 모든 좌표를 다시 계산해야 한다.
6. **건물 이미지**는 바탕(`/map/base.webp`)과 **같은 크기**의 투명 PNG, 경로는 `/map/buildings/{buildingId}.png`. 이미지가 없으면 `location` 중심 회색 사각형 placeholder로 표시·판정된다.
7. **건물 탭 판정은 알파값**(`lib/hitTest.ts`)으로 한다. DOM 클릭 이벤트로 판정하지 않는다. 선택 강조는 CSS `drop-shadow` + 살짝 확대.
8. **장소 카드(PlaceCard)는 하나만.** 건물→층, 필터, 검색, 챗봇 어느 경로로 와도 같은 카드를 재사용한다.
9. **ID 규칙**: 소문자·숫자·하이픈. 장소 ID는 `{건물ID}-{층 소문자}-{종류}` (예: `lib-2f-study`). 층은 `B1`, `1F` 형식.
10. **콘텐츠 금지 항목**: 출입 제한·관계자 외 출입금지·전기실·기계실·보안 시설은 데이터에 넣지 않는다. 모든 장소에 `lastVerified`, `source` 필수.
11. **더미 데이터**는 `meta.dummy: true`로 표시한다(화면에 안내 배너). 예시 값은 `(예시)`를 붙여 실제 정보와 구분한다.
12. TypeScript: `any` 금지, 타입 import는 `import type`(verbatimModuleSyntax). UI 문구는 한국어, 짧고 친근하게.
13. 의존성 추가는 최소화. 추가 시 이유를 커밋 메시지에 남긴다.
