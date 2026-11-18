/** 상단 검색창 (PRD 3장 진입 경로 3). places.json에서 바로 찾는다 (AI 미사용) */
import { useId, useMemo, useRef, useState } from 'react';
import { placeKindLabel } from '../lib/filters';
import { floorLabel } from '../lib/floors';
import type { PlacesData } from '../lib/schema';
import { search } from '../lib/search';
import type { SearchResult } from '../lib/search';

interface Props {
  data: PlacesData;
  onSelect: (result: SearchResult) => void;
}

const MAX_RESULTS = 8;

export function SearchBar({ data, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => search(data, query, MAX_RESULTS), [data, query]);
  const showList = open && query.trim().length > 0;

  const choose = (r: SearchResult) => {
    onSelect(r);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="search" role="search">
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="건물·시설 검색 (예: 도서관 화장실)"
        aria-label="건물·시설 검색"
        aria-controls={listId}
        aria-expanded={showList}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
          } else if (e.key === 'Enter' && results[0]) {
            choose(results[0]);
          }
        }}
      />
      {showList && (
        // 결과를 누를 때 input blur로 목록이 먼저 닫히지 않게 pointerdown 기본 동작을 막는다
        <ul id={listId} className="search-results" onPointerDown={(e) => e.preventDefault()}>
          {results.length === 0 && <li className="search-empty">검색 결과가 없어요</li>}
          {results.map((r) => (
            <li key={r.kind === 'place' ? `p:${r.place.id}` : `b:${r.building.id}`}>
              <button type="button" onClick={() => choose(r)}>
                {r.kind === 'place' ? (
                  <>
                    <span>{r.place.name}</span>
                    <small>
                      {placeKindLabel(r.place)} · {r.building.name} {floorLabel(r.place.floor)}
                    </small>
                  </>
                ) : (
                  <>
                    <span>{r.building.name}</span>
                    <small>건물{r.building.aliases.length > 0 && ` · ${r.building.aliases.join(', ')}`}</small>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
