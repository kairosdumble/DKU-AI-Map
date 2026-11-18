import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePanZoom } from '../hooks/usePanZoom';
import type { MapPoint } from '../hooks/usePanZoom';
import { buildHitIndex, hitTest } from '../lib/hitTest';
import type { HitIndex } from '../lib/hitTest';
import type { Building, MapMeta } from '../lib/schema';
import { BuildingLayer } from './BuildingLayer';

export interface FocusRequest {
  x: number;
  y: number;
}

interface Props {
  map: MapMeta;
  buildings: Building[];
  selectedBuildingId: string | null;
  /** 필터 사용 중일 때 건물별 해당 시설 개수. 필터가 없으면 null */
  filterCounts: ReadonlyMap<string, number> | null;
  /** null = 선택 해제 (투명 영역 탭) */
  onSelectBuilding: (id: string | null) => void;
  /** 새 객체가 들어올 때마다 그 좌표로 지도를 이동 */
  focusRequest: FocusRequest | null;
}

const TRANSITION = 'transform 250ms ease-out';

export function MapView({ map, buildings, selectedBuildingId, filterCounts, onSelectBuilding, focusRequest }: Props) {
  const [hitIndex, setHitIndex] = useState<HitIndex | null>(null);
  const [hitError, setHitError] = useState(false);
  const [baseMissing, setBaseMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHitIndex(null);
    setHitError(false);
    buildHitIndex(buildings, map)
      .then((index) => {
        if (!cancelled) setHitIndex(index);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setHitError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [buildings, map]);

  const handleTap = useCallback(
    (point: MapPoint, target: EventTarget | null) => {
      // 이름표 탭은 버튼 onClick이 처리
      if (target instanceof Element && target.closest('[data-map-label]')) return;
      if (!hitIndex) return;
      onSelectBuilding(hitTest(hitIndex, point.x, point.y));
    },
    [hitIndex, onSelectBuilding],
  );

  const { viewportRef, transform, animating, focusOn, wasDragged, handlers } = usePanZoom({
    contentWidth: map.width,
    contentHeight: map.height,
    onTap: handleTap,
  });

  useEffect(() => {
    if (focusRequest) focusOn(focusRequest.x, focusRequest.y);
  }, [focusRequest, focusOn]);

  const dimmedIds = useMemo(
    () => (filterCounts ? new Set(buildings.filter((b) => !filterCounts.get(b.id)).map((b) => b.id)) : null),
    [buildings, filterCounts],
  );

  const transition = animating ? TRANSITION : 'none';
  const contentStyle = {
    width: map.width,
    height: map.height,
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
    transition,
    // 선택 테두리(drop-shadow) 두께를 화면 기준으로 일정하게 유지하는 데 사용
    '--map-scale': transform.scale || 1,
  } as CSSProperties;

  return (
    <div ref={viewportRef} className="map-viewport" role="region" aria-label="캠퍼스 지도" {...handlers}>
      <div className="map-content" style={contentStyle}>
        {baseMissing ? (
          <div className="map-base map-base--placeholder" />
        ) : (
          <img className="map-base" src={map.base} alt="" draggable={false} onError={() => setBaseMissing(true)} />
        )}
        {hitIndex && (
          <BuildingLayer
            buildings={buildings}
            visuals={hitIndex.visuals}
            selectedId={selectedBuildingId}
            dimmedIds={dimmedIds}
          />
        )}
      </div>

      {/* 이름표는 확대 배율과 무관하게 같은 글자 크기로 보이도록 transform 바깥에 둔다 */}
      <div className="map-labels">
        {buildings.map((b) => {
          const count = filterCounts?.get(b.id) ?? 0;
          const selected = b.id === selectedBuildingId;
          if (filterCounts && count === 0 && !selected) return null;
          const left = transform.x + b.labelPos.x * transform.scale;
          const top = transform.y + b.labelPos.y * transform.scale;
          return (
            <button
              key={b.id}
              type="button"
              data-map-label=""
              className={selected ? 'map-label is-selected' : 'map-label'}
              aria-pressed={selected}
              aria-label={filterCounts ? `${b.name}, 해당 시설 ${count}곳` : b.name}
              style={{ transform: `translate(${left}px, ${top}px) translate(-50%, -50%)`, transition }}
              onClick={(e) => {
                // 이름표 위에서 시작한 드래그가 끝날 때 생기는 click은 무시 (키보드 Enter는 detail === 0)
                if (e.detail !== 0 && wasDragged()) return;
                onSelectBuilding(b.id);
              }}
            >
              <span className="map-label__text">
                {b.name}
                {filterCounts && (
                  <span className="badge" aria-hidden="true">
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!hitIndex && !hitError && <p className="map-status">지도 준비 중…</p>}
      {hitError && <p className="map-status">건물 판정 준비 실패 · 이름표를 눌러 선택하세요</p>}
    </div>
  );
}
