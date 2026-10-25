import Link from 'next/link'
import type { Color, FashionItem, Occasion, Style } from '@/types/content'

export const OCCASION_LABEL: Record<Occasion, string> = {
  work: 'Đi làm',
  school: 'Đi học',
  casual: 'Thường ngày',
  date: 'Đi hẹn',
  event: 'Sự kiện',
}

type Props = {
  item: FashionItem
  styles: Style[]
  colors: Color[]
}

export function ItemFacts({ item, styles, colors }: Props) {
  return (
    <div className="grid gap-10 border-t border-muted/40 pt-10 sm:grid-cols-3">
      <div>
        <h3 className="font-display text-xl">Style phù hợp</h3>
        <ul className="mt-4 space-y-2">
          {styles.map((style) => (
            <li key={style.slug}>
              <Link
                href={`/styles/${style.slug}`}
                className="font-body text-sm text-accent-soft underline-offset-4 hover:text-accent hover:underline"
              >
                {style.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-xl">Dịp mặc</h3>
        <ul className="mt-4 space-y-2">
          {item.occasions.map((occasion) => (
            <li key={occasion} className="font-body text-sm text-accent-soft">
              {OCCASION_LABEL[occasion]}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-xl">Màu đi cùng</h3>
        <ul className="mt-4 space-y-3">
          {colors.map((color) => (
            <li key={color.slug} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full border border-muted/40"
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-body text-sm text-accent-soft">{color.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
