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
//  * Supabase configured but the **RPC call itself fails** (network blip,
//    RLS misconfigured, anything) → `false` (blocked). This is
//    deliberately fail-*closed*, the opposite of the line above: the whole
//    point of this table is to cap what gets spent calling the paid
//    Gemini tagger, so when we cannot find out whether the caller is still
//    under budget, the safe default is "don't spend more", not "spend
//    anyway". The caller never sees an error either way —
//    `src/app/api/closet/tag/route.ts` treats `false` exactly like a real
//    quota hit and falls back to the deterministic tagger.
//
// Reset boundary: UTC midnight, not each user's local midnight. `day` is
// computed from `Date#toISOString().slice(0, 10)`, which is always UTC —
// one unambiguous reset instant shared by every account, instead of
// needing to know (or trust the client to report) each user's timezone.
//
// Atomicity: this used to be a `select` (read today's count) followed by
// an `upsert` (write count + 1) — two separate round trips with an
// `await` in between, which let N concurrent requests from the same
// account all read the same pre-increment count and all pass the limit
// check before any of their writes landed. A review caught this: the cap
// exists specifically to bound per-user spend on a paid call, and that
// race defeats it for the exact actor most likely to try it (a user firing
// several requests at once needs no special access). Fixed by pushing the
// whole "read-and-increment" into one Postgres statement —
// `increment_ai_usage(user_id, day)`, `supabase/migrations/0002_ai_usage.sql`
// — a single `insert … on conflict … do update set count = count + 1
// returning count`. A single-row UPSERT is serialized by Postgres itself
// (the row gets locked for the duration of the statement), so concurrent
// callers queue up at the database, not in this function. The allow/deny
// decision below is computed from the *returned, post-increment* count,
// per the review's suggested fix — the function always increments
// unconditionally (it has no idea what `TAG_DAILY_LIMIT` is; that stays
// here in TypeScript) and this function is what turns "count so far today"
// into a yes/no. `src/lib/rate-limit/memory.ts`'s in-memory limiter avoids
// the same class of race the same way, by never `await`-ing between its
// own read and write — this is that same principle, enforced where it
// actually has to hold: across connections and instances, not just within
// one process.
//
// A consequence worth being explicit about: `ai_usage.count` now counts
// every request that was *counted toward* today's cap, not only the ones
// that went on to actually call Gemini — the same "count attempts, not
// successes" semantics the in-memory rate limiter already uses elsewhere
// in this codebase.

import { createSupabaseServerClient } from '@/lib/supabase/server'

export const TAG_DAILY_LIMIT = 60

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function consumeTagQuota(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return true

  const day = todayUtc()

  const { data, error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_day: day,
  })

  if (error || typeof data !== 'number') return false

  return data <= TAG_DAILY_LIMIT
}
