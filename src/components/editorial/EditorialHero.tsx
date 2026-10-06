import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'

export function EditorialHero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 pb-20 sm:grid-cols-2 sm:items-center sm:pt-16">
      <div>
        <p className="font-body text-xs uppercase tracking-[0.2em] text-accent-soft">
          Số mùa thu
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl">
          Chocolate, burgundy
          <br />
          và những sắc trung tính mới
        </h1>
        <p className="mt-6 max-w-sm font-body text-base text-accent-soft">
          Ba màu làm nên mùa này, và cách mặc chúng mà vẫn giữ outfit thanh lịch.
        </p>
        <Link
          href="/wardrobe"
          className="mt-8 inline-block font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
        >
          Vào tủ đồ
        </Link>
      </div>
      <EditorialImage
        src="/images/hero/thu-2026.jpg"
        alt="Số mùa thu của Bí Mặc"
        ratio="hero"
        priority
      />
    </section>
  )
}
