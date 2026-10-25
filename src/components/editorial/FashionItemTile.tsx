import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { FashionItem } from '@/types/content'

export function FashionItemTile({ item }: { item: FashionItem }) {
  return (
    <Link href={`/wardrobe/${item.category}/${item.slug}`} className="group block">
      <EditorialImage src={item.image} alt={item.name} ratio="look" />
      <h3 className="mt-4 font-display text-xl group-hover:text-accent">{item.name}</h3>
      <p className="mt-2 font-body text-sm text-accent-soft">{item.excerpt}</p>
    </Link>
  )
}
