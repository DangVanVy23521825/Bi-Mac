import Link from 'next/link'
import { SectionHeading } from '@/components/ui/SectionHeading'

export default function ClosetPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Những gì bạn đã lưu" />
      <p className="font-body text-base text-accent-soft">
        Bạn chưa lưu món nào. Lưu được ngay mà không cần tạo tài khoản.
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        <Link href="/styles" className="font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline">
          Khám phá theo style
        </Link>
        <Link href="/stylist" className="font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline">
          Thử AI phối đồ
        </Link>
      </div>
    </div>
  )
}
