import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 같은 와이파이의 휴대폰에서 http://<PC IP>:5173 으로 접속해 테스트할 수 있게 함
    host: true,
    port: 5173,
    // /api/* 는 Cloudflare Pages Functions가 처리한다.
    // `npm run build && npm run pages:dev` 로 8788 포트를 띄워 두면 개발 서버에서도 호출 가능.
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
});
