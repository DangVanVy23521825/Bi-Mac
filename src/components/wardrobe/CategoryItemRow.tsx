import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { FashionItem } from '@/types/content'

type Props = {
  item: FashionItem
  index: number
}

export function CategoryItemRow({ item, index }: Props) {
  const offset = index % 2

  return (
    <article
      data-offset={offset}
      className={`grid gap-6 sm:grid-cols-5 sm:items-center ${
        offset === 1 ? 'sm:[&>:first-child]:order-2' : ''
      }`}
    >
      <div className="sm:col-span-2">
        <EditorialImage src={item.image} alt={item.name} ratio="look" />
      </div>
      <div className="sm:col-span-3">
        <Link href={`/wardrobe/${item.category}/${item.slug}`} className="group block">
          <h3 className="font-display text-2xl group-hover:text-accent">{item.name}</h3>
          <p className="mt-3 max-w-md font-body text-base text-accent-soft">{item.excerpt}</p>
        </Link>
      </div>
    </article>
  )
}
