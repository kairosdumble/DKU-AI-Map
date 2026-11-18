/**
 * 건물 하단 시트 (PRD F1-2, F1-3): 층 선택 / 전체 보기 → 시설 목록 → 장소 카드.
 * 건물이 바뀌면 App에서 key로 다시 마운트되어 층 탭이 '전체'로 초기화된다.
 */
import { useMemo, useState } from 'react';
import { FILTER_LABEL, matchesFilter, placeKindLabel } from '../lib/filters';
import type { FilterId } from '../lib/filters';
import { floorLabel, floorRank, sortFloors } from '../lib/floors';
import type { Building, Place } from '../lib/schema';
import { PlaceCard } from './PlaceCard';

interface Props {
  building: Building;
  /** 이 건물에 속한 장소 전체 */
  places: Place[];
  filter: FilterId | null;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  onClose: () => void;
  onClearFilter: () => void;
}

type FloorTab = 'all' | string;

export function BuildingSheet({
  building,
  places,
  filter,
  selectedPlaceId,
  onSelectPlace,
  onClose,
  onClearFilter,
}: Props) {
  const [floorTab, setFloorTab] = useState<FloorTab>('all');

  const floors = useMemo(
    () => sortFloors([...building.floors.map((f) => f.floor), ...places.map((p) => p.floor)]),
    [building, places],
  );
  const summaryByFloor = useMemo(() => new Map(building.floors.map((f) => [f.floor, f.summary])), [building]);

  const visiblePlaces = useMemo(
    () =>
      places
        .filter((p) => !filter || matchesFilter(p, filter))
        .sort((a, b) => floorRank(a.floor) - floorRank(b.floor)),
    [places, filter],
  );

  const selectedPlace = selectedPlaceId ? places.find((p) => p.id === selectedPlaceId) : undefined;
  const groupFloors = floorTab === 'all' ? floors : [floorTab];

  return (
    <section className="sheet" role="dialog" aria-modal="false" aria-labelledby="sheet-title">
      <header className="sheet__header">
        {selectedPlace && (
          <button type="button" className="icon-btn" onClick={() => onSelectPlace(null)} aria-label="시설 목록으로">
            ‹
          </button>
        )}
        <h2 id="sheet-title">{building.name}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="건물 시트 닫기">
          ✕
        </button>
      </header>

      <div className="sheet__body">
        {selectedPlace ? (
          <PlaceCard place={selectedPlace} building={building} />
        ) : (
          <>
            {building.aliases.length > 0 && <p className="sheet__aliases">별칭: {building.aliases.join(', ')}</p>}

            {filter && (
              <div className="sheet__filter">
                <span>‘{FILTER_LABEL[filter]}’만 보는 중</span>
                <button type="button" className="link-btn" onClick={onClearFilter}>
                  필터 해제
                </button>
              </div>
            )}

            {floors.length === 0 ? (
              <p className="empty">아직 조사 전인 건물이에요.</p>
            ) : (
              <>
                <div className="floor-tabs" role="tablist" aria-label="층 선택">
                  <button
                    type="button"
                    role="tab"
                    className="floor-tab"
                    aria-selected={floorTab === 'all'}
                    onClick={() => setFloorTab('all')}
                  >
                    전체
                  </button>
                  {floors.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="tab"
                      className="floor-tab"
                      aria-selected={floorTab === f}
                      onClick={() => setFloorTab(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {groupFloors.map((floor) => {
                  const items = visiblePlaces.filter((p) => p.floor === floor);
                  const summary = summaryByFloor.get(floor);
                  // 전체 보기 + 필터 사용 중에는 해당 시설이 없는 층을 숨긴다
                  if (floorTab === 'all' && filter && items.length === 0) return null;
                  return (
                    <div key={floor} className="floor-group">
                      <h3>{floorLabel(floor)}</h3>
                      {summary && <p className="floor-summary">{summary}</p>}
                      {items.length > 0 ? (
                        <ul className="place-list">
                          {items.map((p) => (
                            <li key={p.id}>
                              <button type="button" className="place-item" onClick={() => onSelectPlace(p.id)}>
                                <span>{p.name}</span>
                                <small>{placeKindLabel(p)}</small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        floorTab !== 'all' && <p className="empty">이 층에 등록된 시설이 없어요.</p>
                      )}
                    </div>
                  );
                })}

                {filter && visiblePlaces.length === 0 && (
                  <p className="empty">이 건물에는 ‘{FILTER_LABEL[filter]}’ 정보가 아직 없어요.</p>
                )}
              </>
            )}

            {floorTab === 'all' && building.entrances.length > 0 && (
              <div className="floor-group">
                <h3>출입구</h3>
                <ul className="entrance-list">
                  {building.entrances.map((e) => (
                    <li key={e.id}>
                      {e.label} · {floorLabel(e.floor)}
                      {e.stepFree && ' · 계단 없음'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="sheet__meta">
              건물 정보 최종 확인: {building.lastVerified ?? '조사 전'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
