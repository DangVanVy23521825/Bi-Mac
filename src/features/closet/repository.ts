// closet_items repository. Every exported function takes the Supabase
// client as its first parameter instead of calling
// `createSupabaseServerClient()` itself — that is what lets this file's
// tests pass a small fake client and assert on the query it builds,
// without ever reaching a real database (the product rule in CLAUDE.md:
// the suite must pass with zero Supabase env vars set). The caller
// (Task 6/7's route handlers and server actions) is the one that calls
// `createSupabaseServerClient()` and threads the result in here.
//
// `supabase/migrations/0001_account_and_closet.sql` enables RLS on
// `closet_items` scoped to `auth.uid() = user_id`, so in production this
// `.eq('user_id', userId)` is redundant with the database's own check.
// It is kept anyway, on every single query here, because ADR-021 recorded
// that the `(account)` route-group layout is a UI boundary, not a data
// boundary — RLS is the last line of defence, not the only one this layer
// is allowed to lean on. Never remove one of these `.eq('user_id', …)`
// calls on the assumption that RLS already covers it.

import type { SupabaseClient } from '@supabase/supabase-js'

import type { ClosetItem, ClosetItemDraft, LabelSource } from '@/types/closet'
import type { CategorySlug } from '@/types/content'
import type { Fit, ItemAttribute, Occasion } from '@/types/stylist'

const TABLE = 'closet_items'

// The database's column shape (snake_case). Kept private to this module —
// see the comment on `ClosetItem` in `src/types/closet.ts`: nothing
// outside this file should know these column names.
type ClosetItemRow = {
  id: string
  user_id: string
  name: string
  image_path: string
  category: string
  color_slugs: string[]
  style_slugs: string[]
  occasions: string[]
  fit: string | null
  attributes: string[]
  note: string | null
  label_source: string
  created_at: string
}

function rowToClosetItem(row: ClosetItemRow): ClosetItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    imagePath: row.image_path,
    category: row.category as CategorySlug,
    colorSlugs: row.color_slugs,
    styleSlugs: row.style_slugs,
    occasions: row.occasions as Occasion[],
    fit: row.fit as Fit | null,
    attributes: row.attributes as ItemAttribute[],
    note: row.note,
    labelSource: row.label_source as LabelSource,
    createdAt: row.created_at,
  }
}

function draftToRow(draft: ClosetItemDraft): Omit<ClosetItemRow, 'id' | 'user_id' | 'created_at'> {
  return {
    name: draft.name,
    image_path: draft.imagePath,
    category: draft.category,
    color_slugs: draft.colorSlugs,
    style_slugs: draft.styleSlugs,
    occasions: draft.occasions,
    fit: draft.fit,
    attributes: draft.attributes,
    note: draft.note,
    label_source: draft.labelSource,
  }
}

// Only maps keys actually present on `patch` — an `update()` call must
// never overwrite a column the caller didn't mean to touch with
// `undefined` (Postgres would reject that for the `not null` columns, and
// for the nullable ones it would silently clear them).
function patchToRow(patch: Partial<ClosetItemDraft>): Partial<Omit<ClosetItemRow, 'id' | 'user_id' | 'created_at'>> {
  const row: Partial<Omit<ClosetItemRow, 'id' | 'user_id' | 'created_at'>> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.imagePath !== undefined) row.image_path = patch.imagePath
  if (patch.category !== undefined) row.category = patch.category
  if (patch.colorSlugs !== undefined) row.color_slugs = patch.colorSlugs
  if (patch.styleSlugs !== undefined) row.style_slugs = patch.styleSlugs
  if (patch.occasions !== undefined) row.occasions = patch.occasions
  if (patch.fit !== undefined) row.fit = patch.fit
  if (patch.attributes !== undefined) row.attributes = patch.attributes
  if (patch.note !== undefined) row.note = patch.note
  if (patch.labelSource !== undefined) row.label_source = patch.labelSource
  return row
}

export async function listClosetItems(client: SupabaseClient, userId: string): Promise<ClosetItem[]> {
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as ClosetItemRow[]).map(rowToClosetItem)
}

export async function createClosetItem(
  client: SupabaseClient,
  userId: string,
  draft: ClosetItemDraft,
): Promise<ClosetItem> {
  const { data, error } = await client
    .from(TABLE)
    .insert({ ...draftToRow(draft), user_id: userId })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('Không thể lưu món đồ vào tủ. Vui lòng thử lại.')
  }

  return rowToClosetItem(data as ClosetItemRow)
}

export async function updateClosetItem(
  client: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<ClosetItemDraft>,
): Promise<ClosetItem | null> {
  const { data, error } = await client
    .from(TABLE)
    .update(patchToRow(patch))
    // Both filters matter: `.eq('id', id)` narrows to one row, and
    // `.eq('user_id', userId)` is what makes this call a no-op (not a
    // mistaken edit) when `id` belongs to someone else's closet — see the
    // module comment on why that second filter is not optional.
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error || !data) return null
  return rowToClosetItem(data as ClosetItemRow)
}

export async function deleteClosetItem(client: SupabaseClient, userId: string, id: string): Promise<boolean> {
  const { data, error } = await client
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')

  if (error || !data) return false
  return data.length > 0
}
