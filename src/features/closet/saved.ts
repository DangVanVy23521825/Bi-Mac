// `saved_items`/`saved_outfits`/`saved_styles` repository — the Bí Mặc
// catalog things a user has bookmarked, as opposed to `repository.ts`'s
// `closet_items` (the user's own photographed wardrobe, Task 7).
//
// Same conventions as `repository.ts`: every exported function takes the
// Supabase client as its first parameter and carries its own explicit
// `.eq('user_id', userId)` alongside RLS (ADR-021 — the route boundary is
// a UI gate, not a data-isolation boundary).
//
// The one thing this module is *not* allowed to do: trust a slug just
// because it is sitting in the database. The catalog lives in
// `src/data/fixtures/` (TypeScript), not in Postgres — `saved_items.item_slug`
// etc. have no foreign key, by design (spec §6.2). Two directions, two
// different rules:
//
//   - Reading (`listSaved*`): a row can legitimately point at a slug that
//     has since been removed from the fixtures. Map it to its fixture
//     record and drop it — silently, no thrown error, no placeholder —
//     when that lookup misses. This is Review Focus #4.
//   - Writing (`toggleSaved*`): validate the slug against the fixtures
//     *before* inserting a new row. A Server Action wrapping this is a
//     publicly reachable RPC endpoint, not a call only our own buttons can
//     make, so this module — not just the caller — must refuse an unknown
//     slug.
//
// `toggleSaved*` is a true toggle, not read-then-write: it issues a
// `delete().select()` first and reads *that* result to learn whether the
// row existed, instead of a separate `select()` to check before deciding
// what to do. If the delete removed a row, the slug was saved and is now
// unsaved — done in one statement, and a stale/removed-from-fixtures slug
// can still be unsaved this way (validation only guards the insert
// branch, below). If the delete removed nothing, the slug was not saved;
// only then does it validate against the fixtures and insert.

import type { SupabaseClient } from '@supabase/supabase-js'

import { allItems, allOutfits, allStyles } from '@/data'
import type { FashionItem, Outfit, Style } from '@/types/content'

const ITEMS_TABLE = 'saved_items'
const OUTFITS_TABLE = 'saved_outfits'
const STYLES_TABLE = 'saved_styles'

async function toggleSavedSlug(
  client: SupabaseClient,
  table: string,
  column: string,
  userId: string,
  slug: string,
  existsInCatalog: boolean,
  notFoundMessage: string,
): Promise<boolean> {
  const { data: removed, error: deleteError } = await client
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq(column, slug)
    .select(column)

  if (deleteError) {
    throw new Error('Không thể lưu lựa chọn này. Vui lòng thử lại.')
  }

  if (removed && removed.length > 0) {
    return false
  }

  if (!existsInCatalog) {
    throw new Error(notFoundMessage)
  }

  const { error: insertError } = await client.from(table).insert({ user_id: userId, [column]: slug })

  if (insertError) {
    throw new Error('Không thể lưu lựa chọn này. Vui lòng thử lại.')
  }

  return true
}

export async function toggleSavedItem(client: SupabaseClient, userId: string, itemSlug: string): Promise<boolean> {
  const existsInCatalog = allItems.some((item) => item.slug === itemSlug)
  return toggleSavedSlug(
    client,
    ITEMS_TABLE,
    'item_slug',
    userId,
    itemSlug,
    existsInCatalog,
    'Món đồ này không còn trong catalog của Bí Mặc.',
  )
}

export async function toggleSavedStyle(client: SupabaseClient, userId: string, styleSlug: string): Promise<boolean> {
  const existsInCatalog = allStyles.some((style) => style.slug === styleSlug)
  return toggleSavedSlug(
    client,
    STYLES_TABLE,
    'style_slug',
    userId,
    styleSlug,
    existsInCatalog,
    'Style này không còn trong catalog của Bí Mặc.',
  )
}

async function fetchSavedSlugs(client: SupabaseClient, table: string, column: string, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from(table)
    .select(column)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as Record<string, string>[])
    .map((row) => row[column])
    .filter((slug): slug is string => slug !== undefined)
}

export async function listSavedItems(client: SupabaseClient, userId: string): Promise<FashionItem[]> {
  const slugs = await fetchSavedSlugs(client, ITEMS_TABLE, 'item_slug', userId)
  return slugs
    .map((slug) => allItems.find((item) => item.slug === slug))
    .filter((item): item is FashionItem => item !== undefined)
}

export async function listSavedOutfits(client: SupabaseClient, userId: string): Promise<Outfit[]> {
  const slugs = await fetchSavedSlugs(client, OUTFITS_TABLE, 'outfit_slug', userId)
  return slugs
    .map((slug) => allOutfits.find((outfit) => outfit.slug === slug))
    .filter((outfit): outfit is Outfit => outfit !== undefined)
}

export async function listSavedStyles(client: SupabaseClient, userId: string): Promise<Style[]> {
  const slugs = await fetchSavedSlugs(client, STYLES_TABLE, 'style_slug', userId)
  return slugs
    .map((slug) => allStyles.find((style) => style.slug === slug))
    .filter((style): style is Style => style !== undefined)
}

async function isSlugSaved(client: SupabaseClient, table: string, column: string, userId: string, slug: string): Promise<boolean> {
  const { data, error } = await client
    .from(table)
    .select(column)
    .eq('user_id', userId)
    .eq(column, slug)
    .maybeSingle()

  if (error) return false
  return data !== null
}

export async function isItemSaved(client: SupabaseClient, userId: string, itemSlug: string): Promise<boolean> {
  return isSlugSaved(client, ITEMS_TABLE, 'item_slug', userId, itemSlug)
}

export async function isStyleSaved(client: SupabaseClient, userId: string, styleSlug: string): Promise<boolean> {
  return isSlugSaved(client, STYLES_TABLE, 'style_slug', userId, styleSlug)
}
