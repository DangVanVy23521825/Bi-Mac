import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RelatedOutfits } from '@/components/editorial/RelatedOutfits'
import { SaveButton } from '@/components/closet/SaveButton'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ItemFacts } from '@/components/wardrobe/ItemFacts'
import {
  allItems,
  getColorsForItem,
  getItemBySlug,
  getRelatedOutfits,
  getStylesForItem,
} from '@/data'
import { getViewer } from '@/features/account/guard'
import { isItemSaved, listSavedOutfits } from '@/features/closet/saved'
import { toggleSavedItemAction, toggleSavedOutfitAction } from '@/features/closet/savedActions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Params = { category: string; slug: string }

export async function generateStaticParams() {
  return allItems.map((item) => ({ category: item.category, slug: item.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const item = await getItemBySlug(slug)

  if (!item) {
    return {}
  }

  return {
    title: item.name,
    description: item.excerpt,
  }
}

export default async function ItemDetailPage({ params }: { params: Promise<Params> }) {
  const { category, slug } = await params
  const item = await getItemBySlug(slug)

  if (!item || item.category !== category) {
    notFound()
  }

  const [styles, colors, related] = await Promise.all([
    getStylesForItem(item.slug),
    getColorsForItem(item.slug),
    getRelatedOutfits(item.slug),
  ])

  // Trang này vẫn phải xem được không cần đăng nhập (quyết định #3) — nên
  // không gọi `requireUserId()`, hàm đó redirect.
  //
  // `getViewer()` chứ không phải `getAuthState()` rồi `getCurrentUserId()`:
  // đây là trang CÔNG KHAI, chia sẻ được bằng link, và lời gọi
  // `getCurrentUserId()` thứ hai ấy không có guard (hàm đó cố ý không tự
  // guard — xem `guard.ts`), nên một lỗi auth chớp nhoáng ở lượt gọi mạng
  // thứ hai là một trang lỗi ngay cửa trước của sản phẩm. Một lượt
  // `auth.getUser()` giờ trả cả hai nửa, và nó được guard.
  //
  // Khi chưa cấu hình Supabase, nhánh này dừng trước khi chạm `cookies()`
  // nên trang vẫn tĩnh được như cũ (xác nhận bằng `pnpm build` không có
  // biến môi trường — và xem ADR-023 về việc root layout đã làm cả app
  // dynamic khi Supabase ĐƯỢC cấu hình).
  const { authState, userId } = await getViewer()
  let itemSaved = false
  let savedOutfitSlugs = new Set<string>()
  if (authState.status === 'signed-in' && userId) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      itemSaved = await isItemSaved(supabase, userId, item.slug)
      // Một truy vấn cho cả trang — các look liên quan dưới đây tra slug
      // của chính mình trong tập này, không mỗi look tự gọi một query.
      const saved = await listSavedOutfits(supabase, userId)
      savedOutfitSlugs = new Set(saved.map((outfit) => outfit.slug))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <EditorialImage src={item.image} alt={item.name} ratio="portrait" priority />
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{item.name}</h1>
          <p className="mt-4 max-w-md font-body text-base text-accent-soft">{item.excerpt}</p>
          {authState.status !== 'unconfigured' && (
            <div className="mt-6">
              <SaveButton
                slug={item.slug}
                initialSaved={itemSaved}
                isSignedIn={authState.status === 'signed-in'}
                onToggle={toggleSavedItemAction}
              />
            </div>
          )}
        </div>
      </div>

      <section className="mt-16">
        <SectionHeading eyebrow="Tổng quan" title="Là gì" />
        <p className="max-w-2xl font-body text-base text-accent-soft">{item.whatItIs}</p>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Chi tiết" title="Đặc điểm" />
        <ul className="max-w-2xl space-y-3 font-body text-base text-accent-soft">
          {item.characteristics.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Cách phối" title="Phối thế nào" />
        <p className="max-w-2xl font-body text-base text-accent-soft">{item.howToStyle}</p>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Lưu ý" title="Nên tránh" />
        <p className="max-w-2xl font-body text-base text-accent-soft">{item.whatToAvoid}</p>
      </section>

      <section className="mt-16">
        <ItemFacts item={item} styles={styles} colors={colors} />
      </section>

      <section className="mt-16">
        <RelatedOutfits
          related={related}
          save={
            authState.status === 'unconfigured'
              ? undefined
              : {
                  isSignedIn: authState.status === 'signed-in',
                  onToggle: toggleSavedOutfitAction,
                  savedSlugs: savedOutfitSlugs,
                }
          }
        />
      </section>
    </div>
  )
}
