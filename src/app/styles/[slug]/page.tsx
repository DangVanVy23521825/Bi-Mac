import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OutfitLook } from '@/components/editorial/OutfitLook'
import { SaveButton } from '@/components/closet/SaveButton'
import { CtaLink } from '@/components/ui/CtaLink'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  allStyles,
  getColorStory,
  getItemsForStyle,
  getOutfitsForStyle,
  getStyleBySlug,
} from '@/data'
import { getViewer } from '@/features/account/guard'
import { isStyleSaved, listSavedOutfits } from '@/features/closet/saved'
import { toggleSavedOutfitAction, toggleSavedStyleAction } from '@/features/closet/savedActions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Params = { slug: string }

export async function generateStaticParams() {
  return allStyles.map((style) => ({ slug: style.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const style = await getStyleBySlug(slug)

  if (!style) {
    return {}
  }

  return {
    title: style.name,
    description: style.tagline,
  }
}

export default async function StyleDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const style = await getStyleBySlug(slug)

  if (!style) {
    notFound()
  }

  const [colors, items, outfits] = await Promise.all([
    getColorStory(),
    getItemsForStyle(style.slug),
    getOutfitsForStyle(style.slug),
  ])

  const palette = colors.filter((color) => style.colorSlugs.includes(color.slug))

  // Cùng lý do với trang item detail: trang này vẫn công khai, không cần
  // đăng nhập (quyết định #3), nên không gọi `requireUserId()` — và dùng
  // `getViewer()` để lấy `authState` cùng `userId` trong một lượt
  // `auth.getUser()` có guard, thay vì một lời gọi `getCurrentUserId()`
  // thứ hai không guard trên một URL công khai.
  const { authState, userId } = await getViewer()
  let styleSaved = false
  let savedOutfitSlugs = new Set<string>()
  if (authState.status === 'signed-in' && userId) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      styleSaved = await isStyleSaved(supabase, userId, style.slug)
      // Một truy vấn cho cả trang, không phải một truy vấn mỗi look — các
      // look hiển thị ở "Look mẫu" dưới đây tra slug của chính nó trong
      // tập này thay vì mỗi look tự gọi `isOutfitSaved`.
      const saved = await listSavedOutfits(supabase, userId)
      savedOutfitSlugs = new Set(saved.map((outfit) => outfit.slug))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <EditorialImage src={style.image} alt={style.name} ratio="portrait" priority />
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{style.name}</h1>
          <p className="mt-4 max-w-md font-body text-base text-accent-soft">{style.tagline}</p>
          {authState.status !== 'unconfigured' && (
            <div className="mt-6">
              <SaveButton
                slug={style.slug}
                initialSaved={styleSaved}
                isSignedIn={authState.status === 'signed-in'}
                onToggle={toggleSavedStyleAction}
              />
            </div>
          )}
        </div>
      </div>

      <section className="mt-16 space-y-6">
        {style.paragraphs.map((paragraph, index) => (
          <p key={index} className="max-w-2xl font-body text-base text-accent-soft">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Màu sắc" title="Bảng màu" />
        <ul className="flex flex-wrap gap-6">
          {palette.map((color) => (
            <li key={color.slug} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border border-muted/40"
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-body text-sm text-accent-soft">{color.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Tủ đồ" title="Món chủ chốt" />
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/wardrobe/${item.category}/${item.slug}`}
                className="font-body text-base text-accent-soft underline-offset-4 hover:text-accent hover:underline"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Cách phối" title="Công thức phối" />
        <ul className="max-w-2xl space-y-3 font-body text-base text-accent-soft">
          {style.outfitFormulas.map((formula) => (
            <li key={formula}>{formula}</li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="Gợi ý" title="Look mẫu" />
        <div className="space-y-16">
          {outfits.map((outfit) => (
            <OutfitLook
              key={outfit.slug}
              outfit={outfit}
              save={
                authState.status === 'unconfigured'
                  ? undefined
                  : {
                      initialSaved: savedOutfitSlugs.has(outfit.slug),
                      isSignedIn: authState.status === 'signed-in',
                      onToggle: toggleSavedOutfitAction,
                    }
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-muted/40 pt-16 text-center">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-accent-soft">
          Đi tiếp
        </p>
        <h2 className="mt-4 font-display text-3xl">Muốn gợi ý riêng cho bạn?</h2>
        <div className="mt-8">
          <CtaLink href="/stylist" variant="secondary">
            Thử AI phối đồ
          </CtaLink>
        </div>
      </section>
    </div>
  )
}
