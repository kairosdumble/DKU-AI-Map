/**
 * GET /api/health — 배포·로컬 함수 동작 확인용.
 * 로컬: npm run build && npm run pages:dev → http://localhost:8788/api/health
 */
export const onRequestGet: PagesFunction = () =>
  new Response(
    JSON.stringify({
      status: 'ok',
      service: 'dku-campus-guide',
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
