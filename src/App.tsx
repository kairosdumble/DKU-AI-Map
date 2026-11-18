import { useCallback, useEffect, useMemo, useState } from 'react';
import { BuildingSheet } from './components/BuildingSheet';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import type { FocusRequest } from './components/MapView';
import { SearchBar } from './components/SearchBar';
import { loadPlacesData } from './lib/dataLoader';
import { FILTERS, FILTER_LABEL, matchesFilter } from './lib/filters';
import type { FilterId } from './lib/filters';
import type { Place, PlacesData } from './lib/schema';
import type { SearchResult } from './lib/search';

export default function App() {
  const [data, setData] = useState<PlacesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    loadPlacesData(ac.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => ac.abort();
  }, []);

  const buildingsById = useMemo(() => new Map(data?.buildings.map((b) => [b.id, b]) ?? []), [data]);

  const placesByBuilding = useMemo(() => {
    const map = new Map<string, Place[]>();
    for (const p of data?.places ?? []) {
      const list = map.get(p.buildingId) ?? [];
      list.push(p);
      map.set(p.buildingId, list);
    }
    return map;
  }, [data]);

  /** 필터 칩에 표시할 필터별 전체 개수 */
  const filterTotals = useMemo(() => {
    const totals = Object.fromEntries(FILTERS.map((f) => [f.id, 0])) as Record<FilterId, number>;
    for (const p of data?.places ?? []) {
      for (const f of FILTERS) if (matchesFilter(p, f.id)) totals[f.id]++;
    }
    return totals;
  }, [data]);

  /** 필터 사용 중일 때 건물별 해당 시설 개수 (이름표 배지) */
  const filterCounts = useMemo(() => {
    if (!data || !filter) return null;
    const counts = new Map<string, number>();
    for (const p of data.places) {
      if (matchesFilter(p, filter)) counts.set(p.buildingId, (counts.get(p.buildingId) ?? 0) + 1);
    }
    return counts;
  }, [data, filter]);

  const selectBuilding = useCallback((id: string | null) => {
    setSelectedBuildingId(id);
    setSelectedPlaceId(null);
  }, []);

  const handleSearchSelect = useCallback((r: SearchResult) => {
    setSelectedBuildingId(r.building.id);
    setSelectedPlaceId(r.kind === 'place' ? r.place.id : null);
    setFocusRequest({ x: r.building.location.x, y: r.building.location.y });
  }, []);

  if (error) {
    return (
      <div className="app-error" role="alert">
        <h1>데이터를 불러오지 못했어요</h1>
        <pre>{error}</pre>
      </div>
    );
  }
  if (!data) {
    return <p className="app-loading">불러오는 중…</p>;
  }

  const selectedBuilding = selectedBuildingId ? buildingsById.get(selectedBuildingId) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <SearchBar data={data} onSelect={handleSearchSelect} />
        <FilterBar value={filter} onChange={setFilter} totals={filterTotals} />
        {data.meta.dummy && <p className="dummy-banner">지금은 예시(더미) 데이터예요. 실제 시설 정보와 다를 수 있어요.</p>}
      </header>

      <main className="map-area">
        <MapView
          map={data.meta.map}
          buildings={data.buildings}
          selectedBuildingId={selectedBuildingId}
          filterCounts={filterCounts}
          onSelectBuilding={selectBuilding}
          focusRequest={focusRequest}
        />
        {filter && filterCounts?.size === 0 && (
          <p className="map-toast" role="status">
            아직 등록된 ‘{FILTER_LABEL[filter]}’ 정보가 없어요
          </p>
        )}
      </main>

      {selectedBuilding && (
        <BuildingSheet
          key={selectedBuilding.id}
          building={selectedBuilding}
          places={placesByBuilding.get(selectedBuilding.id) ?? []}
          filter={filter}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onClose={() => selectBuilding(null)}
          onClearFilter={() => setFilter(null)}
        />
      )}
    </div>
  );
}
