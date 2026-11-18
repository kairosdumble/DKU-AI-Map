/**
 * 장소 카드 (PRD F1-3). 진입 경로(건물→층, 필터, 검색, 챗봇)와 상관없이 이 컴포넌트 하나만 쓴다.
 */
import { SOURCE_LABEL, placeKindLabel } from '../lib/filters';
import { floorLabel } from '../lib/floors';
import { reportUrl } from '../lib/report';
import type { Accessibility, Building, Place } from '../lib/schema';

interface Props {
  place: Place;
  building: Building;
}

function accessibilityItems(a: Accessibility): string[] {
  const items: string[] = [];
  if (a.stepFree === true) items.push('계단 없이 접근 가능');
  if (a.stepFree === false) items.push('계단 있음');
  if (a.elevator === true) items.push('엘리베이터 이용 가능');
  if (a.accessibleRestroom === true) items.push('장애인·가족 화장실 있음');
  if (a.accessibleRestroomNearby === true) items.push('근처에 장애인 화장실 있음');
  if (a.note) items.push(a.note);
  return items;
}

export function PlaceCard({ place, building }: Props) {
  const url = reportUrl(place.id);
  const a11y = accessibilityItems(place.accessibility);
  const titleId = `place-title-${place.id}`;

  return (
    <article className="place-card" aria-labelledby={titleId}>
      <p className="place-card__kind">{placeKindLabel(place)}</p>
      <h3 id={titleId}>{place.name}</h3>
      <p className="place-card__where">
        {building.name} · {floorLabel(place.floor)}
      </p>
      {place.locationHint && <p className="place-card__hint">{place.locationHint}</p>}

      <dl>
        <dt>운영시간</dt>
        <dd>{place.hours ?? '확인된 정보 없음'}</dd>

        {place.features.length > 0 && (
          <>
            <dt>특징</dt>
            <dd>
              <ul>
                {place.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </dd>
          </>
        )}

        {place.manners.length > 0 && (
          <>
            <dt>이용 매너</dt>
            <dd>
              <ul>
                {place.manners.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </dd>
          </>
        )}

        {a11y.length > 0 && (
          <>
            <dt>접근성</dt>
            <dd>
              <ul>
                {a11y.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>

      {place.photos.length > 0 && (
        <div className="place-card__photos">
          {place.photos.map((src, i) => (
            <img key={src} src={src} alt={`${place.name} 사진 ${i + 1}`} loading="lazy" decoding="async" />
          ))}
        </div>
      )}

      <p className="place-card__meta">
        최종 확인 {place.lastVerified} · {SOURCE_LABEL[place.source]}
      </p>

      {url ? (
        <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
          정보가 틀렸나요? 오류 제보
        </a>
      ) : (
        <button type="button" className="btn" disabled>
          오류 제보 (준비 중)
        </button>
      )}
    </article>
  );
}
