import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
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
