'use server'

// Server Action wrappers for `saved.ts` — the thin layer `SaveButton`
// (a Client Component) actually calls. Separate module from `saved.ts`
// itself for the same reason `actions.ts` is separate from
// `repository.ts` (Task 7): a `'use server'` file's exports are all
// treated as Server Actions with serializable signatures, which rules out
// `saved.ts`'s functions (their first parameter is a `SupabaseClient`,
// not something a client component could ever hand back) — and keeping
// the testable, client-supplied-first-arg functions in their own plain
// module is what let `saved.test.ts` unit-test them with a fake client
// instead of a real request.
//
// Each action calls `requireUserId()` itself rather than trusting a
// `userId` passed in — a Server Action is a publicly reachable RPC
// endpoint the moment it's exported, not a call only `SaveButton` can
// make, so an unauthenticated direct call must still be rejected here,
// not merely by the button never rendering for a signed-out visitor.

import { requireUserId } from '@/features/account/guard'
import { toggleSavedItem, toggleSavedOutfit, toggleSavedStyle } from '@/features/closet/saved'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const CONFIG_ERROR = 'Tính năng này cần Supabase được cấu hình, hiện chưa có.'
const GENERIC_ERROR = 'Không thể lưu lựa chọn này. Vui lòng thử lại.'

export type ToggleSavedResult = { ok: true; saved: boolean } | { ok: false; error: string }

export async function toggleSavedItemAction(itemSlug: string): Promise<ToggleSavedResult> {
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  try {
    const saved = await toggleSavedItem(supabase, userId, itemSlug)
    return { ok: true, saved }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : GENERIC_ERROR }
  }
}

export async function toggleSavedStyleAction(styleSlug: string): Promise<ToggleSavedResult> {
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  try {
    const saved = await toggleSavedStyle(supabase, userId, styleSlug)
    return { ok: true, saved }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : GENERIC_ERROR }
  }
}

export async function toggleSavedOutfitAction(outfitSlug: string): Promise<ToggleSavedResult> {
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  try {
    const saved = await toggleSavedOutfit(supabase, userId, outfitSlug)
    return { ok: true, saved }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : GENERIC_ERROR }
  }
}
