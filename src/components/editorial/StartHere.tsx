import Link from 'next/link'
import { SectionHeading } from '@/components/ui/SectionHeading'

// Ba lối vào, xếp từ ít cam kết nhất tới nhiều nhất: đọc → đối chiếu → được
// gợi ý riêng. Đây là câu trả lời cho người mới vào trang chủ, nên nó đứng
// ngay sau hero chứ không nằm cuối trang.
const ENTRY_POINTS = [
  {
    href: '/wardrobe',
    title: 'Hiểu món bạn đang có',
    body: 'Từ điển tủ đồ: mỗi món là gì, đi với dáng người nào, mặc dịp nào thì đúng.',
    linkLabel: 'Mở tủ đồ',
  },
  {
    href: '/styles',
    title: 'Tìm hướng style của bạn',
    body: 'Năm hướng style, mỗi hướng có bảng màu và outfit mẫu để bạn tự đối chiếu.',
    linkLabel: 'Xem các hướng style',
  },
  {
    href: '/stylist',
    title: 'Để Bí Mặc gợi ý riêng',
    body: 'Trả lời bốn câu hỏi, nhận outfit cụ thể kèm lý do vì sao nó hợp với bạn.',
    linkLabel: 'Bắt đầu phối đồ',
  },
] as const

export function StartHere() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Start here" title="Ba cách dùng Bí Mặc" />
      <p className="-mt-4 mb-12 max-w-xl font-body text-base text-accent-soft">
        Bí Mặc không bán quần áo. Bí Mặc giúp bạn hiểu để mặc đẹp hơn với những gì
        đang có trong tủ.
      </p>

      <ol className="grid gap-12 sm:grid-cols-3">
        {ENTRY_POINTS.map((entry, index) => (
          <li key={entry.href} className="border-t border-muted/40 pt-6">
            <p aria-hidden="true" className="font-display text-3xl text-muted">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-4 font-display text-2xl">{entry.title}</h3>
            <p className="mt-3 font-body text-sm leading-relaxed text-accent-soft">{entry.body}</p>
            <Link
              href={entry.href}
              className="mt-5 inline-block font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
            >
              {entry.linkLabel}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
