import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryItemRow } from '@/components/wardrobe/CategoryItemRow'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getCategories, getCategoryBySlug, getItemsByCategory } from '@/data'

type Params = { category: string }

export async function generateStaticParams() {
  const categories = await getCategories()
  return categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { category: categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)

  if (!category) {
    return {}
  }

  return {
    title: category.name,
    description: category.intro,
  }
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category: categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)

  if (!category) {
    notFound()
  }

  const items = await getItemsByCategory(category.slug)

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ" title={category.name} />
      <p className="max-w-xl font-body text-base text-accent-soft">{category.intro}</p>
      <div className="mt-12 space-y-16">
        {items.map((item, index) => (
          <CategoryItemRow key={item.slug} item={item} index={index} />
        ))}
      </div>
    </div>
  )
}
