// `profiles.preferences` — the smallest piece of "remember this user
// across visits" this milestone ships: the answers from their last AI
// Stylist questionnaire, so returning to `/stylist` can prefill the form
// instead of starting blank every time. This is deliberately not a
// conversation-memory schema — it is one JSON blob in a column the
// `profiles` table (`supabase/migrations/0001_account_and_closet.sql`)
// already has, documented there as exactly this: Task 12's save point and
// nothing more. Nobody yet knows what a later "real memory" milestone will
// need, so this does not try to anticipate it.
//
// `loadPreferences`/`savePreferences` take only a `userId` and create their
// own Supabase client via `createSupabaseServerClient()` (Task 1) — unlike
// `src/features/closet/repository.ts`'s client-first functions, every
// caller here only ever has a user id in hand, never an already-built
// client, and both directions already have to treat "Supabase unconfigured"
// as an ordinary degrade path rather than something a caller decides.
//
// Both directions tolerate every failure by doing/returning nothing:
//
// - `loadPreferences` returns `null` for a missing session, an
//   unconfigured Supabase project, a missing profile row, an empty/default
//   `preferences` value, a read error, *or* stored JSON that no longer
//   satisfies `stylistAnswersSchema`. `OCCASIONS` and the other vocabularies
//   in `src/types/stylist.ts` are documented as allowed to widen over time,
//   so data saved under an older schema can legitimately stop parsing —
//   re-validating on read (not trusting whatever shape is sitting in the
//   column) is what keeps that safe. A caller that gets `null` must treat
//   it exactly like "no saved answers" and never throw or partially
//   prefill a form from data that didn't fully validate.
//
// - `savePreferences` upserts rather than updates. The migration's
//   `handle_new_user` trigger inserts a `profiles` row on signup, but the
//   same migration's `profiles_delete_own` policy lets a signed-in user
//   delete that row afterwards — and the trigger is `after insert on
//   auth.users`, so it cannot re-fire to recreate the row. A plain `update`
//   would then silently match zero rows and lose the write with no error.
//   `savePreferences` also never throws: the AI Stylist route calls this
//   after a successful turn, fire-and-forget, and a database hiccup here
//   must never cost the caller the answer they actually asked for.

import { stylistAnswersSchema } from '@/features/stylist/input'
import type { StylistAnswers } from '@/types/stylist'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const TABLE = 'profiles'

export async function loadPreferences(userId: string): Promise<StylistAnswers | null> {
  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return null

    const { data, error } = await supabase.from(TABLE).select('preferences').eq('id', userId).maybeSingle()

    if (error || !data) return null

    const preferences = (data as { preferences: unknown }).preferences
    if (!preferences) return null

    const parsed = stylistAnswersSchema.safeParse(preferences)
    return parsed.success ? parsed.data : null
  } catch {
    // A thrown Supabase client (network hiccup, auth error) reads as "no
    // saved answers" — see module comment. The questionnaire must never
    // crash because this best-effort read failed.
    return null
  }
}

export async function savePreferences(userId: string, answers: StylistAnswers): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return

    await supabase.from(TABLE).upsert({ id: userId, preferences: answers }, { onConflict: 'id' })
  } catch {
    // Best-effort — see module comment. The caller already got their
    // stylist response; this write failing must never surface anywhere.
  }
}
