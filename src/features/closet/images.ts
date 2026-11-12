// Closet image path + signed URL. The `closet` bucket is private (no
// `public = false` → no public URL, see
// `supabase/migrations/0001_account_and_closet.sql`), so every image the
// client renders must come from a short-lived signed URL minted here, on
// the server (docs/07_SECURITY_PRIVACY.md: "short-lived signed access or
// server-controlled access when required").
//
// Unlike `repository.ts`, this module calls `createSupabaseServerClient()`
// directly instead of taking a client parameter — it follows the same
// shape as `session.ts`/`guard.ts` (Task 1/3), not the repository's
// injected-client shape, because the brief's own signature for
// `signClosetImage` takes only a `path`, no client. That is also exactly
// what the "unconfigured" test needs: `createSupabaseServerClient()`
// already resolves to `null` without any network call when Supabase env
// vars are absent, so the test for that path never touches a database.

import { createSupabaseServerClient } from '@/lib/supabase/server'

const BUCKET = 'closet'

// Long enough that a page render and the user looking at the resulting
// image doesn't race the URL's expiry, short enough that a leaked link
// (copy-pasted, logged by an intermediary, etc.) stops working soon
// after. Re-derived on every render instead of cached, so there is no
// stale-but-still-valid window to reason about.
const SIGNED_URL_TTL_SECONDS = 300

export function closetImagePath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}

export async function signClosetImage(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null

  return data.signedUrl
}
