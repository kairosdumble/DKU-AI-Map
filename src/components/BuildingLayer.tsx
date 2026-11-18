import type { BuildingVisual } from '../lib/hitTest';
import type { Building } from '../lib/schema';

interface Props {
  buildings: Building[];
  visuals: Record<string, BuildingVisual>;
  selectedId: string | null;
  /** 필터 사용 중 해당 시설이 없는 건물 (흐리게 표시). 필터가 없으면 null */
  dimmedIds: ReadonlySet<string> | null;
}

/**
 * 건물 그림 레이어. 지도 transform 안쪽(지도 픽셀 좌표계)에 그려진다.
 * 이미지가 있으면 바탕과 같은 크기의 투명 PNG를 겹치고, 없으면 회색 사각형을 그린다.
 * 탭 판정은 여기서 하지 않는다 (pointer-events: none, lib/hitTest.ts 담당).
 */
export function BuildingLayer({ buildings, visuals, selectedId, dimmedIds }: Props) {
  return (
    <>
      {buildings.map((b) => {
        const visual = visuals[b.id];
        if (!visual) return null;
        const className = [
          'building',
          `building--${visual.kind}`,
          b.id === selectedId && 'is-selected',
          dimmedIds?.has(b.id) && 'is-dimmed',
        ]
          .filter(Boolean)
          .join(' ');

        if (visual.kind === 'image') {
          return (
            <img
              key={b.id}
              className={className}
              src={b.image}
              alt=""
              draggable={false}
              style={{ transformOrigin: `${b.location.x}px ${b.location.y}px` }}
            />
          );
        }
        const { x, y, width, height } = visual.rect;
        return <div key={b.id} className={className} style={{ left: x, top: y, width, height }} aria-hidden="true" />;
      })}
    </>
  );
}
