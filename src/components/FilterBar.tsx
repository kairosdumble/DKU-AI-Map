/** 시설 종류 필터 칩 (PRD 3장 진입 경로 2). 같은 칩을 다시 누르면 해제 */
import { FILTERS } from '../lib/filters';
import type { FilterId } from '../lib/filters';

interface Props {
  value: FilterId | null;
  onChange: (value: FilterId | null) => void;
  /** 필터별 전체 장소 수 */
  totals: Record<FilterId, number>;
}

export function FilterBar({ value, onChange, totals }: Props) {
  return (
    <div className="filter-bar" role="toolbar" aria-label="시설 종류 필터">
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            className="chip"
            aria-pressed={active}
            onClick={() => onChange(active ? null : f.id)}
          >
            {f.label}
            <span className="chip__count">{totals[f.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
