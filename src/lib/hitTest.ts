/**
 * 건물 탭 판정 (PRD F1-2).
 * 건물별 투명 PNG(바탕 지도와 같은 크기)의 알파값을 미리 읽어 두고,
 * 탭한 지도 좌표에서 알파값이 있는 '가장 위' 건물을 고른다.
 *
 * - 메모리를 아끼려고 HIT_SCALE 배율로 줄여서 읽고, 불투명 영역의 bounding box만 저장한다.
 * - 이미지가 없거나 깨졌으면 location 중심의 회색 사각형(placeholder)을 대신 그려서 판정한다.
 * - 나중에 data 순서상 뒤에 있는 건물이 화면에서도 위에 그려진다 (BuildingLayer와 동일).
 */
import type { Building, MapMeta } from './schema';

/** 알파 마스크 해상도 (0.25 = 3000×4500 지도를 750×1125로 읽음) */
export const HIT_SCALE = 0.25;
/** 이 값보다 큰 알파만 '건물'로 본다. 축소 시 생기는 가장자리 반투명 픽셀을 무시하기 위함 */
export const ALPHA_THRESHOLD = 10;
/** 이미지가 없을 때 쓰는 회색 사각형 크기 (지도 픽셀) */
export const PLACEHOLDER_SIZE = { width: 320, height: 240 } as const;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BuildingVisual = { kind: 'image' } | { kind: 'placeholder'; rect: Rect };

interface HitMask {
  buildingId: string;
  /** 마스크 좌표계(HIT_SCALE 적용) 기준 bounding box */
  left: number;
  top: number;
  width: number;
  height: number;
  alpha: Uint8Array;
}

export interface HitIndex {
  masks: HitMask[];
  visuals: Record<string, BuildingVisual>;
}

export function placeholderRect(building: Building): Rect {
  const { width, height } = PLACEHOLDER_SIZE;
  return {
    x: building.location.x - width / 2,
    y: building.location.y - height / 2,
    width,
    height,
  };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function extractMask(buildingId: string, image: ImageData): HitMask | null {
  const { width, height, data } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const maskWidth = maxX - minX + 1;
  const maskHeight = maxY - minY + 1;
  const alpha = new Uint8Array(maskWidth * maskHeight);
  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      alpha[y * maskWidth + x] = data[((y + minY) * width + (x + minX)) * 4 + 3];
    }
  }
  return { buildingId, left: minX, top: minY, width: maskWidth, height: maskHeight, alpha };
}

export async function buildHitIndex(buildings: Building[], map: MapMeta): Promise<HitIndex> {
  const w = Math.ceil(map.width * HIT_SCALE);
  const h = Math.ceil(map.height * HIT_SCALE);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D를 사용할 수 없습니다.');

  const images = await Promise.all(buildings.map((b) => loadImage(b.image)));
  const masks: HitMask[] = [];
  const visuals: Record<string, BuildingVisual> = {};

  buildings.forEach((building, i) => {
    ctx.clearRect(0, 0, w, h);
    const img = images[i];
    if (img) {
      if (img.naturalWidth !== map.width || img.naturalHeight !== map.height) {
        console.warn(
          `[hitTest] ${building.image} 크기 ${img.naturalWidth}×${img.naturalHeight}가 지도 ${map.width}×${map.height}와 다릅니다.`,
        );
      }
      ctx.drawImage(img, 0, 0, w, h);
      visuals[building.id] = { kind: 'image' };
    } else {
      const rect = placeholderRect(building);
      ctx.fillStyle = '#000';
      ctx.fillRect(rect.x * HIT_SCALE, rect.y * HIT_SCALE, rect.width * HIT_SCALE, rect.height * HIT_SCALE);
      visuals[building.id] = { kind: 'placeholder', rect };
    }
    const mask = extractMask(building.id, ctx.getImageData(0, 0, w, h));
    if (mask) masks.push(mask);
  });

  return { masks, visuals };
}

/** 지도 픽셀 좌표 (x, y)에 있는 가장 위 건물의 ID. 투명 영역이면 null */
export function hitTest(index: HitIndex, x: number, y: number): string | null {
  const hx = Math.floor(x * HIT_SCALE);
  const hy = Math.floor(y * HIT_SCALE);
  for (let i = index.masks.length - 1; i >= 0; i--) {
    const m = index.masks[i];
    const lx = hx - m.left;
    const ly = hy - m.top;
    if (lx < 0 || ly < 0 || lx >= m.width || ly >= m.height) continue;
    if (m.alpha[ly * m.width + lx] > ALPHA_THRESHOLD) return m.buildingId;
  }
  return null;
}
