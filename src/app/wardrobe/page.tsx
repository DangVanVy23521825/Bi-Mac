import { SectionHeading } from '@/components/ui/SectionHeading'

const CATEGORIES = [
  { slug: 'tops', name: 'Áo' },
  { slug: 'bottoms', name: 'Quần & chân váy' },
  { slug: 'dresses', name: 'Váy liền' },
  { slug: 'outerwear', name: 'Áo khoác' },
  { slug: 'accessories', name: 'Phụ kiện' },
]

export default function WardrobePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ" title="Từ điển thời trang" />
      <p className="max-w-xl font-body text-base text-accent-soft">
        Mỗi món đồ được giải thích là gì, đặc điểm ra sao, phối với gì, và nên tránh điều gì.
      </p>
      <ul className="mt-12 divide-y divide-muted/40 border-t border-muted/40">
        {CATEGORIES.map((c) => (
          <li key={c.slug} className="py-6 font-display text-3xl">
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
