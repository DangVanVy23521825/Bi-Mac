import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` ném lỗi ngay lúc import ở mọi điều kiện export khác
      // `react-server` — kể cả Vitest. Xem `test/server-only-stub.ts` cho
      // lý do đầy đủ; tóm tắt: alias này chỉ áp cho test, `next build` vẫn
      // dùng package thật nên hàng rào chặn service-role key lọt vào bundle
      // client không hề bị nới.
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // A shell export (or a CI secret) of GOOGLE_GENERATIVE_AI_API_KEY must
    // never let any test take the real-Gemini path — Vitest's `test.env`
    // overrides the process environment for the whole run, so this forces
    // every test onto the deterministic/no-key path regardless of what the
    // invoking shell or CI runner has exported. `.env` on disk is not the
    // risk here (Vitest does not load it); an exported shell variable is.
    env: {
      GOOGLE_GENERATIVE_AI_API_KEY: '',
    },
  },
})
