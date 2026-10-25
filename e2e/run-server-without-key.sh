#!/usr/bin/env bash
# Runs the production server for the Playwright demo-path spec with
# GOOGLE_GENERATIVE_AI_API_KEY genuinely absent, so the AI Stylist takes its
# deterministic fallback path.
#
# Why this exists: Next.js's own env loader (@next/env) reads `.env` from
# disk when `next build`/`next start` run, regardless of what
# `webServer.env` sets in playwright.config.ts (verified — both setting the
# key to '' via webServer.env and `env -u GOOGLE_GENERATIVE_AI_API_KEY` get
# silently overridden once Next re-reads `.env`). The only mechanism that
# reliably works is making `.env` genuinely unavailable on disk while
# `next build`/`next start` boot — this script does exactly that.
#
# Restoring `.env` does NOT wait for this script to be killed. Next reads
# env once at process start and never re-reads it while `next start` is
# already serving, so the moment the server answers its first request we
# put `.env` back immediately — the already-running process keeps
# whatever (absent) key it loaded at boot, regardless of what the file
# says afterward. This matters because relying on an EXIT/INT/TERM trap to
# restore `.env` on teardown is not reliable here: Playwright's webServer
# teardown was observed, in practice, to leave this script's trap without
# a chance to run (the server process disappears without the trap firing
# every time) — plausibly a SIGKILL somewhere in the kill path, which no
# trap can intercept. Restoring early shrinks the window where the
# developer's real `.env` is missing from "the whole test run" (open-ended
# under `reuseExistingServer`) to "a few seconds during build + boot", and
# removes the teardown signal entirely from the correctness argument. The
# trap below is kept only as a best-effort safety net for the (now much
# smaller) window before boot finishes.
set -uo pipefail

ENV_FILE=".env"
BACKUP_FILE=".env.e2e-backup"

restore() {
  if [ -f "$BACKUP_FILE" ]; then
    mv -f "$BACKUP_FILE" "$ENV_FILE"
  fi
}
trap restore EXIT INT TERM

if [ -f "$ENV_FILE" ]; then
  mv -f "$ENV_FILE" "$BACKUP_FILE"
fi

if ! pnpm build; then
  exit 1
fi

pnpm start &
SERVER_PID=$!

# Poll until the server answers, then restore immediately — see the
# comment block above for why this is safe and why it's the real fix.
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://localhost:3000/"; then
    break
  fi
  sleep 1
done

restore

wait "$SERVER_PID"
