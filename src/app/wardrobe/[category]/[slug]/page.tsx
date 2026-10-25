import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RelatedOutfits } from '@/components/editorial/RelatedOutfits'
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <EditorialImage src={item.image} alt={item.name} ratio="portrait" priority />
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{item.name}</h1>
          <p className="mt-4 max-w-md font-body text-base text-accent-soft">{item.excerpt}</p>
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
        <RelatedOutfits related={related} />
      </section>
    </div>
  )
}
