import { defineConfig, devices } from '@playwright/test'

// E2E lock on the product's one invariant: home → item → related style →
// stylist → result, plus every detail page returning 200 and no horizontal
// overflow at 360px. See `e2e/demo-path.spec.ts`.
//
// The webServer command runs `e2e/run-server-without-key.sh`, not `pnpm
// build && pnpm start` directly — Next.js reads `.env` from disk itself, so
// setting `GOOGLE_GENERATIVE_AI_API_KEY` via `env` below would be
// overridden the moment Next re-parses `.env`. The script makes `.env`
// genuinely absent for the life of the server, which is the only
// mechanism that reliably forces the deterministic fallback path.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // reuseExistingServer is true outside CI, so a `pnpm dev` already
    // running on :3000 with a real key would be reused instead of the
    // keyless server above — but that is not a silent hole: the demo-path
    // test asserts the fallback banner (`role="status"`, "dự phòng") is
    // visible, which only renders when no primary Gemini provider was
    // constructed. A reused real-key server fails that assertion loudly
    // instead of quietly skipping the no-key guarantee.
    command: 'bash e2e/run-server-without-key.sh',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
