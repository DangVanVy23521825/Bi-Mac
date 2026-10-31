// closetItemDraftSchema — the one validation gate a closet item draft must
// pass before it reaches `repository.ts`, whether it was typed by a user
// or produced by an AI label (Task 11). Every vocabulary field is an enum
// derived from the same source of truth as the database check constraints
// in `supabase/migrations/0001_account_and_closet.sql` — never a bare
// `z.string()` — so a value that would be rejected by the database is
// rejected here first, with a Vietnamese message the UI can show
// directly instead of a raw Postgres constraint-violation error.
//
// This module imports `@/data` for the real color/style slug lists. That
// is allowed here but would not be allowed in `src/lib/ai/**`: §7 of the
// architecture doc draws the catalog-import boundary at `src/lib/ai/`,
// not at `src/features/`, and this file lives on the catalog side of it
// (same as `src/features/stylist/resolve.ts`).

import { z } from 'zod'

import { allColors, allStyles } from '@/data'
import type { ClosetItemDraft } from '@/types/closet'
import { OCCASIONS, type Fit, type ItemAttribute } from '@/types/stylist'

const categoryValues = ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'] as const

const fitValues: [Fit, ...Fit[]] = ['fitted', 'relaxed', 'oversized']

// Same list `src/features/stylist/input.ts` builds — kept as a separate
// literal here rather than imported, because importing it would pull in
// `photo-limits.ts`'s stylist-pipeline concerns for no reason; `ItemAttribute`
// itself (the type both lists are checked against) is still the single
// shared source, so the two lists cannot drift without `tsc` catching it.
const itemAttributeValues: [ItemAttribute, ...ItemAttribute[]] = [
  'sleeveless',
  'sheer',
  'clingy',
  'structured-shoulder',
  'cropped',
  'high-heel',
  'short-hem',
  'bright-color',
]

const labelSourceValues = ['ai', 'user'] as const

const colorSlugSet = new Set(allColors.map((color) => color.slug))
const styleSlugSet = new Set(allStyles.map((style) => style.slug))

export const closetItemDraftSchema: z.ZodType<ClosetItemDraft> = z.object({
  name: z.string().trim().min(1, { error: 'Tên món đồ không được để trống' }),
  imagePath: z.string().min(1, { error: 'Thiếu đường dẫn ảnh' }),
  category: z.enum(categoryValues, { error: 'Loại trang phục không hợp lệ' }),
  colorSlugs: z
    .array(z.string())
    .refine((slugs) => slugs.every((slug) => colorSlugSet.has(slug)), {
      error: 'Có màu không nằm trong danh mục màu của Bí Mặc',
    }),
  styleSlugs: z
    .array(z.string())
    .refine((slugs) => slugs.every((slug) => styleSlugSet.has(slug)), {
      error: 'Có phong cách không nằm trong danh mục style của Bí Mặc',
    }),
  occasions: z.array(z.enum(OCCASIONS, { error: 'Dịp không hợp lệ' })),
  fit: z.enum(fitValues, { error: 'Dáng không hợp lệ' }).nullable(),
  attributes: z.array(z.enum(itemAttributeValues, { error: 'Đặc điểm không hợp lệ' })),
  note: z.string().nullable(),
  labelSource: z.enum(labelSourceValues, { error: 'Nguồn gán nhãn không hợp lệ' }),
})
