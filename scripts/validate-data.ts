/**
 * public/data/places.json 을 zod 스키마(src/lib/schema.ts)로 검사한다.
 *   npm run validate          스키마 오류만 실패 처리, 빠진 이미지는 경고
 *   npm run validate:strict   빠진 이미지·사진도 실패 처리 (실제 지도 반영 후 사용)
 * npm run build 앞에서 자동 실행된다.
 */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlacesFileSchema, formatIssues } from '../src/lib/schema';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const target = path.join(publicDir, 'data', 'places.json');
const strict = process.argv.includes('--strict');

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<number> {
  const rel = path.relative(root, target);

  let json: unknown;
  try {
    json = JSON.parse(await readFile(target, 'utf8'));
  } catch (e) {
    console.error(`✖ ${rel} 읽기 또는 JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }

  const result = PlacesFileSchema.safeParse(json);
  if (!result.success) {
    console.error(`✖ ${rel} 스키마 오류 ${result.error.issues.length}건`);
    console.error(formatIssues(result.error));
    return 1;
  }
  const data = result.data;

  const assets = [
    data.meta.map.base,
    ...data.buildings.map((b) => b.image),
    ...data.places.flatMap((p) => p.photos),
  ];
  const missing: string[] = [];
  for (const asset of assets) {
    if (!(await exists(path.join(publicDir, asset)))) missing.push(asset);
  }
  if (missing.length > 0) {
    const log = strict ? console.error : console.warn;
    log(`${strict ? '✖' : '⚠'} public/ 에 없는 파일 ${missing.length}개${strict ? '' : ' (화면에서는 회색 placeholder로 표시)'}`);
    for (const m of missing) log(`  - ${m}`);
    if (strict) return 1;
  }

  console.log(
    `✔ ${rel} OK · 건물 ${data.buildings.length}개, 장소 ${data.places.length}개` +
      (data.meta.dummy ? ' (더미 데이터)' : ''),
  );
  return 0;
}

main().then((code) => process.exit(code));
