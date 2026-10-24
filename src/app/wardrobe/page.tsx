import Link from 'next/link'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getCategories } from '@/data'

export default async function WardrobePage() {
  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ" title="Từ điển thời trang" />
      <p className="max-w-xl font-body text-base text-accent-soft">
        Mỗi món đồ được giải thích là gì, đặc điểm ra sao, phối với gì, và nên tránh điều gì.
      </p>
      <ul className="mt-12 divide-y divide-muted/40 border-t border-muted/40">
        {categories.map((category) => (
          <li key={category.slug} className="py-6">
            <Link href={`/wardrobe/${category.slug}`} className="group block">
              <h3 className="font-display text-3xl group-hover:text-accent">{category.name}</h3>
              <p className="mt-2 max-w-xl font-body text-sm text-accent-soft">{category.intro}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
