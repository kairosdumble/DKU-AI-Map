/**
 * places.json 스키마 (PRD 4장).
 * - 이 파일이 데이터 타입의 단일 원천이다. 타입은 z.infer 로만 만든다.
 * - 좌표는 위경도가 아니라 지도 그림(meta.map.width × height) 기준 x, y 픽셀.
 * - subcategory 값을 추가하려면 PRD 4장 표와 src/lib/filters.ts 도 함께 수정한다.
 */
import { z } from 'zod';

// ── 기본 타입 ───────────────────────────────────────────────

/** 지하는 B1~B9, 지상은 1F~99F */
export const FLOOR_PATTERN = /^(B[1-9]|[1-9][0-9]?F)$/;

const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자·숫자·하이픈(-)만 사용합니다 (예: lib-2f-study)');

const FloorSchema = z.string().regex(FLOOR_PATTERN, '층은 B1, 1F, 2F 형식으로 적습니다');

const DateSchema = z.iso.date({ message: '날짜는 YYYY-MM-DD 형식으로 적습니다' });

const PublicPathSchema = z.string().startsWith('/', 'public 폴더 기준 절대 경로(/로 시작)로 적습니다');

export const PointSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
});

// ── 분류 ────────────────────────────────────────────────────

export const CATEGORIES = ['restroom', 'amenity', 'study'] as const;

/** PRD 4장 subcategory 표 순서 = 필터 버튼 순서 */
export const AMENITY_SUBCATEGORIES = [
  'atm',
  'convenience_store',
  'umbrella',
  'gym',
  'vending',
  'printer',
  'stationery',
  'etc',
] as const;

export const STUDY_SUBCATEGORIES = ['reading_room', 'study_room', 'lounge'] as const;

export const SOURCES = ['field', 'website', 'notice'] as const;

// ── meta ────────────────────────────────────────────────────

export const MapMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  base: PublicPathSchema,
});

export const MetaSchema = z.object({
  version: z.string().min(1),
  updatedAt: DateSchema,
  campus: z.literal('jukjeon'),
  map: MapMetaSchema,
  /** true 이면 현장 조사 전 예시 데이터. 화면 상단에 안내 배너를 띄운다. */
  dummy: z.boolean().optional(),
});

// ── buildings ───────────────────────────────────────────────

export const EntranceSchema = z.object({
  id: IdSchema,
  label: z.string().min(1),
  floor: FloorSchema,
  stepFree: z.boolean(),
  location: PointSchema,
});

export const FloorInfoSchema = z.object({
  floor: FloorSchema,
  summary: z.string().min(1),
});

export const BuildingSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  /** 바탕 지도와 같은 크기의 투명 PNG. 규칙: /map/buildings/{id}.png */
  image: PublicPathSchema,
  /** 이름표 위치 (픽셀) */
  labelPos: PointSchema,
  /** 건물 중심 (픽셀). 검색 시 지도 이동, 선택 시 확대 기준점 */
  location: PointSchema,
  entrances: z.array(EntranceSchema).default([]),
  floors: z.array(FloorInfoSchema).default([]),
  /** 건물 정보 최종 확인일. 조사 전이면 null */
  lastVerified: DateSchema.nullable(),
});

// ── places ──────────────────────────────────────────────────

export const AccessibilitySchema = z.object({
  stepFree: z.boolean().optional(),
  elevator: z.boolean().optional(),
  /** 이 장소 자체가 장애인·가족 화장실을 갖췄는지 (restroom 용) */
  accessibleRestroom: z.boolean().optional(),
  accessibleRestroomNearby: z.boolean().optional(),
  note: z.string().min(1).optional(),
});

const PlaceBaseSchema = z.object({
  /** {건물ID}-{층 소문자}-{종류} 형식. 예: lib-2f-study */
  id: IdSchema,
  name: z.string().min(1),
  buildingId: IdSchema,
  floor: FloorSchema,
  locationHint: z.string().min(1).nullable().default(null),
  /** 운영시간 텍스트. 모르면 null */
  hours: z.string().min(1).nullable(),
  features: z.array(z.string().min(1)).default([]),
  manners: z.array(z.string().min(1)).default([]),
  accessibility: AccessibilitySchema.default({}),
  photos: z.array(PublicPathSchema).default([]),
  lastVerified: DateSchema,
  source: z.enum(SOURCES),
});

export const PlaceSchema = z.discriminatedUnion('category', [
  PlaceBaseSchema.extend({
    category: z.literal('restroom'),
    subcategory: z.null(),
  }),
  PlaceBaseSchema.extend({
    category: z.literal('amenity'),
    subcategory: z.enum(AMENITY_SUBCATEGORIES),
  }),
  PlaceBaseSchema.extend({
    category: z.literal('study'),
    subcategory: z.enum(STUDY_SUBCATEGORIES),
  }),
]);

// ── 파일 전체 + 교차 검사 ───────────────────────────────────

export const PlacesFileSchema = z
  .object({
    meta: MetaSchema,
    buildings: z.array(BuildingSchema).min(1),
    places: z.array(PlaceSchema),
  })
  .superRefine((data, ctx) => {
    const { width, height } = data.meta.map;

    const checkPoint = (p: { x: number; y: number }, path: (string | number)[]) => {
      if (p.x > width || p.y > height) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `좌표 (${p.x}, ${p.y})가 지도 크기 ${width}×${height} 밖에 있습니다`,
        });
      }
    };

    const buildingFloors = new Map<string, Set<string>>();
    const seenBuildingIds = new Set<string>();
    const seenEntranceIds = new Set<string>();

    data.buildings.forEach((b, bi) => {
      if (seenBuildingIds.has(b.id)) {
        ctx.addIssue({ code: 'custom', path: ['buildings', bi, 'id'], message: `건물 ID 중복: ${b.id}` });
      }
      seenBuildingIds.add(b.id);

      const expectedImage = new RegExp(`^/map/buildings/${b.id}\\.(png|webp)$`);
      if (!expectedImage.test(b.image)) {
        ctx.addIssue({
          code: 'custom',
          path: ['buildings', bi, 'image'],
          message: `건물 이미지는 /map/buildings/${b.id}.png 형식이어야 합니다`,
        });
      }

      checkPoint(b.labelPos, ['buildings', bi, 'labelPos']);
      checkPoint(b.location, ['buildings', bi, 'location']);

      const floors = new Set<string>();
      b.floors.forEach((f, fi) => {
        if (floors.has(f.floor)) {
          ctx.addIssue({ code: 'custom', path: ['buildings', bi, 'floors', fi], message: `층 중복: ${f.floor}` });
        }
        floors.add(f.floor);
      });
      buildingFloors.set(b.id, floors);

      b.entrances.forEach((e, ei) => {
        if (seenEntranceIds.has(e.id)) {
          ctx.addIssue({ code: 'custom', path: ['buildings', bi, 'entrances', ei, 'id'], message: `출입구 ID 중복: ${e.id}` });
        }
        seenEntranceIds.add(e.id);
        checkPoint(e.location, ['buildings', bi, 'entrances', ei, 'location']);
      });
    });

    const seenPlaceIds = new Set<string>();
    data.places.forEach((p, pi) => {
      if (seenPlaceIds.has(p.id)) {
        ctx.addIssue({ code: 'custom', path: ['places', pi, 'id'], message: `장소 ID 중복: ${p.id}` });
      }
      seenPlaceIds.add(p.id);

      const floors = buildingFloors.get(p.buildingId);
      if (!floors) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', pi, 'buildingId'],
          message: `존재하지 않는 건물 ID: ${p.buildingId}`,
        });
        return;
      }
      if (!floors.has(p.floor)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', pi, 'floor'],
          message: `${p.buildingId} 건물의 floors 목록에 ${p.floor}이(가) 없습니다`,
        });
      }
      const prefix = `${p.buildingId}-${p.floor.toLowerCase()}-`;
      if (!p.id.startsWith(prefix)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', pi, 'id'],
          message: `장소 ID는 '${prefix}종류' 형식이어야 합니다 (현재: ${p.id})`,
        });
      }
    });
  });

// ── 타입 ────────────────────────────────────────────────────

export type Point = z.infer<typeof PointSchema>;
export type MapMeta = z.infer<typeof MapMetaSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Entrance = z.infer<typeof EntranceSchema>;
export type FloorInfo = z.infer<typeof FloorInfoSchema>;
export type Building = z.infer<typeof BuildingSchema>;
export type Accessibility = z.infer<typeof AccessibilitySchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type PlacesData = z.infer<typeof PlacesFileSchema>;
export type Category = (typeof CATEGORIES)[number];
export type AmenitySubcategory = (typeof AMENITY_SUBCATEGORIES)[number];
export type StudySubcategory = (typeof STUDY_SUBCATEGORIES)[number];
export type Source = (typeof SOURCES)[number];

/** zod 오류를 사람이 읽기 쉬운 줄 목록으로 */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.') || '(root)';
      return `- ${path}: ${issue.message}`;
    })
    .join('\n');
}
