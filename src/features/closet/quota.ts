// Per-user, per-day quota for the AI garment-tagging call (Task 6). Lives
// in Postgres (`supabase/migrations/0002_ai_usage.sql`), not
// `src/lib/rate-limit/`'s in-memory limiter — that module's own file
// documents why it cannot work here: its counter is per-instance and dies
// with the instance, but this limit is per *account* and must survive both
// a redeploy and a multi-instance deployment.
//
// Like `images.ts`, this calls `createSupabaseServerClient()` itself
// rather than taking a client parameter — the brief's signature for
// `consumeTagQuota` takes only a `userId`, no client, and that is also
// exactly what makes the "unconfigured" case free: `createSupabaseServerClient()`
// already resolves to `null` without any network call when Supabase env
// vars are absent.
//
// Two deliberate "fail" directions, not one, and they are opposite on
// purpose:
//  * Supabase **not configured at all** → `true` (allowed). There is no
//    backing store to enforce a limit against, and this is the same
//    product rule everywhere else in this seam (`getSupabaseEnv`,
//    `signClosetImage`, …): the app must boot and pass its suite with zero
//    Supabase env vars, never by throwing or silently blocking a feature
//    that has nothing to check against.
//  * Supabase configured but the **read or write to `ai_usage` itself
//    fails** (network blip, RLS misconfigured, anything) → `false`
//    (blocked). This is deliberately fail-*closed*, the opposite of the
//    line above: the whole point of this table is to cap what gets spent
//    calling the paid Gemini tagger, so when we cannot find out whether
//    the caller is still under budget, the safe default is "don't spend
//    more", not "spend anyway". The caller never sees an error either
//    way — `src/app/api/closet/tag/route.ts` treats `false` exactly like
//    a real quota hit and falls back to the deterministic tagger.
//
// Reset boundary: UTC midnight, not each user's local midnight. `day` is
// computed from `Date#toISOString().slice(0, 10)`, which is always UTC —
// one unambiguous reset instant shared by every account, instead of
// needing to know (or trust the client to report) each user's timezone.
//
// Not perfectly atomic under concurrent requests from the very same user
// (a read-then-write race could in principle let one or two extra calls
// through right at the boundary) — accepted for an MVP per-user cap this
// size; a stricter design would push the increment into a single
// Postgres function instead of a select then an upsert.

import { createSupabaseServerClient } from '@/lib/supabase/server'

const TABLE = 'ai_usage'

export const TAG_DAILY_LIMIT = 60

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function consumeTagQuota(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return true

  const day = todayUtc()

  const { data: existing, error: selectError } = await supabase
    .from(TABLE)
    .select('count')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle()

  if (selectError) return false

  const currentCount = (existing as { count: number } | null)?.count ?? 0
  if (currentCount >= TAG_DAILY_LIMIT) return false

  const { error: upsertError } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, day, count: currentCount + 1 }, { onConflict: 'user_id,day' })

  if (upsertError) return false

  return true
}
