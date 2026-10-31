import Link from 'next/link'
import { SectionHeading } from '@/components/ui/SectionHeading'

// `/closet` vẫn là trang tổng cho mọi nội dung đã lưu (looks, styles —
// Task sau); phần tủ đồ của riêng người dùng (thêm/sửa nhãn/xoá món) sống
// ở `/closet/items` (Task 7), vẫn trong cùng route group `(account)` nên
// kế thừa cùng một cổng đăng nhập.
export default function ClosetPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Những gì bạn đã lưu" />
      <p className="font-body text-base text-accent-soft">
        Tủ đồ của bạn, do chính bạn chụp lại — nền tảng để AI phối đồ gợi ý đúng với những gì bạn
        đang có, không phải những gì catalog nghĩ bạn nên có.
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        <Link
          href="/closet/items"
          className="font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
        >
          Xem tủ đồ của tôi
        </Link>
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
