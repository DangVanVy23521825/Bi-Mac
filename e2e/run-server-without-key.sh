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
# reliably works is making `.env` genuinely unavailable on disk for the
# lifetime of the build+start process, then restoring it — this script does
# exactly that and nothing else. It never runs outside `pnpm test:e2e`, so
# normal `pnpm dev` / `pnpm build` behavior is untouched.
set -uo pipefail

ENV_FILE=".env"
BACKUP_FILE=".env.e2e-backup"

restore() {
  if [ -f "$BACKUP_FILE" ]; then
    mv -f "$BACKUP_FILE" "$ENV_FILE"
  fi
}
trap restore EXIT

if [ -f "$ENV_FILE" ]; then
  mv -f "$ENV_FILE" "$BACKUP_FILE"
fi

pnpm build && pnpm start
