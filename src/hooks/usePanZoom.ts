/**
 * 지도 핀치 줌·드래그 이동 (외부 라이브러리 없이 Pointer Events + CSS transform).
 * - 지도 밖으로 끌려 나가지 않게 위치·배율을 제한한다 (PRD F1-1).
 * - 드래그 없이 짧게 누르면 onTap으로 '지도 픽셀 좌표'를 넘긴다.
 * - 데스크톱에서는 마우스 휠로 확대/축소.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

interface Options {
  contentWidth: number;
  contentHeight: number;
  /** 최대 확대 배율 (1 = 지도 이미지 원본 픽셀 1:1) */
  maxScale?: number;
  onTap?: (point: MapPoint, target: EventTarget | null) => void;
}

type Gesture =
  | {
      kind: 'pan';
      startT: Transform;
      startX: number;
      startY: number;
      startTime: number;
      moved: boolean;
      target: EventTarget | null;
    }
  | { kind: 'pinch'; startT: Transform; startDist: number; startMidX: number; startMidY: number };

const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 500;
const WHEEL_ZOOM_SPEED = 0.0015;
/** 검색 결과로 이동할 때 최소 배율 */
const FOCUS_MIN_SCALE = 0.45;
/** 하단 시트에 가리지 않도록 화면 위쪽 35% 지점에 맞춤 */
const FOCUS_ANCHOR_Y = 0.35;

export function usePanZoom({ contentWidth, contentHeight, maxScale = 1.5, onTap }: Options) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 0 });
  const [animating, setAnimating] = useState(false);

  const transformRef = useRef(transform);
  const sizeRef = useRef({ width: 0, height: 0 });
  const initializedRef = useRef(false);
  const pointersRef = useRef(new Map<number, MapPoint>());
  const gestureRef = useRef<Gesture | null>(null);
  const movedRef = useRef(false);
  const onTapRef = useRef(onTap);

  useLayoutEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const clampScale = useCallback(
    (scale: number) => {
      const { width, height } = sizeRef.current;
      const min = Math.min(width / contentWidth, height / contentHeight);
      return Math.min(Math.max(scale, min), Math.max(maxScale, min));
    },
    [contentWidth, contentHeight, maxScale],
  );

  const apply = useCallback(
    (next: Transform, animate = false) => {
      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) return;
      const scale = clampScale(next.scale);
      const cw = contentWidth * scale;
      const ch = contentHeight * scale;
      const clamped: Transform = {
        scale,
        x: cw <= width ? (width - cw) / 2 : Math.min(0, Math.max(width - cw, next.x)),
        y: ch <= height ? (height - ch) / 2 : Math.min(0, Math.max(height - ch, next.y)),
      };
      transformRef.current = clamped;
      setTransform(clamped);
      setAnimating(animate);
    },
    [clampScale, contentWidth, contentHeight],
  );

  /** 화면 좌표 (px, py)를 고정점으로 확대/축소 */
  const zoomAt = useCallback(
    (px: number, py: number, rawScale: number) => {
      const t = transformRef.current;
      const scale = clampScale(rawScale);
      const mx = (px - t.x) / t.scale;
      const my = (py - t.y) / t.scale;
      apply({ scale, x: px - mx * scale, y: py - my * scale });
    },
    [apply, clampScale],
  );

  // 뷰포트 크기 추적 + 첫 화면은 지도가 화면을 꽉 채우는(cover) 배율로 가운데 정렬
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      sizeRef.current = { width, height };
      if (width === 0 || height === 0) return;
      if (!initializedRef.current) {
        initializedRef.current = true;
        const cover = Math.max(width / contentWidth, height / contentHeight);
        apply({ scale: cover, x: (width - contentWidth * cover) / 2, y: (height - contentHeight * cover) / 2 });
      } else {
        apply(transformRef.current);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [apply, contentWidth, contentHeight]);

  // 휠 줌: React onWheel은 passive라 preventDefault가 안 돼서 직접 등록
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, transformRef.current.scale * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const localPoint = (e: ReactPointerEvent): MapPoint => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startPan = (p: MapPoint, target: EventTarget | null, moved: boolean) => {
    gestureRef.current = {
      kind: 'pan',
      startT: transformRef.current,
      startX: p.x,
      startY: p.y,
      startTime: performance.now(),
      moved,
      target,
    };
  };

  const startPinch = () => {
    const [a, b] = [...pointersRef.current.values()];
    gestureRef.current = {
      kind: 'pinch',
      startT: transformRef.current,
      startDist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startMidX: (a.x + b.x) / 2,
      startMidY: (a.y + b.y) / 2,
    };
    movedRef.current = true;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = localPoint(e);
    pointersRef.current.set(e.pointerId, p);
    // 이름표 버튼 위에서 시작한 경우 capture하지 않아야 버튼 click이 정상 동작한다
    const target = e.target as Element;
    if (!target.closest?.('[data-map-label]')) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setAnimating(false);
    if (pointersRef.current.size === 1) {
      movedRef.current = false;
      startPan(p, e.target, false);
    } else if (pointersRef.current.size === 2) {
      startPinch();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const p = localPoint(e);
    pointersRef.current.set(e.pointerId, p);
    const g = gestureRef.current;
    if (!g) return;

    if (g.kind === 'pan' && pointersRef.current.size === 1) {
      const dx = p.x - g.startX;
      const dy = p.y - g.startY;
      if (!g.moved && Math.hypot(dx, dy) > TAP_SLOP_PX) {
        g.moved = true;
        movedRef.current = true;
      }
      if (g.moved) apply({ ...g.startT, x: g.startT.x + dx, y: g.startT.y + dy });
    } else if (g.kind === 'pinch' && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const scale = clampScale((g.startT.scale * dist) / g.startDist);
      const mx = (g.startMidX - g.startT.x) / g.startT.scale;
      const my = (g.startMidY - g.startT.y) / g.startT.scale;
      apply({ scale, x: midX - mx * scale, y: midY - my * scale });
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const g = gestureRef.current;
    const p = localPoint(e);
    pointersRef.current.delete(e.pointerId);

    if (
      e.type === 'pointerup' &&
      g?.kind === 'pan' &&
      !g.moved &&
      pointersRef.current.size === 0 &&
      performance.now() - g.startTime < TAP_MAX_MS
    ) {
      const t = transformRef.current;
      onTapRef.current?.({ x: (p.x - t.x) / t.scale, y: (p.y - t.y) / t.scale }, g.target);
    }

    if (pointersRef.current.size === 1) {
      // 핀치 중 손가락 하나를 떼면 남은 손가락으로 이어서 드래그 (탭으로 치지 않음)
      const [rest] = [...pointersRef.current.values()];
      startPan(rest, null, true);
    } else if (pointersRef.current.size >= 2) {
      startPinch();
    } else {
      gestureRef.current = null;
    }
  };

  /** 지도 픽셀 좌표 (x, y)가 화면 위쪽에 오도록 부드럽게 이동 */
  const focusOn = useCallback(
    (x: number, y: number) => {
      const { width, height } = sizeRef.current;
      const scale = clampScale(Math.max(transformRef.current.scale, FOCUS_MIN_SCALE));
      apply({ scale, x: width / 2 - x * scale, y: height * FOCUS_ANCHOR_Y - y * scale }, true);
    },
    [apply, clampScale],
  );

  return {
    viewportRef,
    transform,
    animating,
    focusOn,
    /** 직전 제스처가 드래그·핀치였는지 (이름표 click 무시용) */
    wasDragged: () => movedRef.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
