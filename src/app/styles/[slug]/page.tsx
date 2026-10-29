import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OutfitLook } from '@/components/editorial/OutfitLook'
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <EditorialImage src={style.image} alt={style.name} ratio="portrait" priority />
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{style.name}</h1>
          <p className="mt-4 max-w-md font-body text-base text-accent-soft">{style.tagline}</p>
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
            <OutfitLook key={outfit.slug} outfit={outfit} />
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
