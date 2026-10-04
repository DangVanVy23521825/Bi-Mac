import Link from 'next/link'

export function StylistCta() {
  return (
    <section className="border-y border-muted/40 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-accent-soft">
          Hỏi Bí Mặc
        </p>
        <h2 className="mt-4 font-display text-4xl">Không biết bắt đầu từ đâu?</h2>
        <p className="mt-5 font-body text-base text-accent-soft">
          Trả lời vài câu hỏi, Bí Mặc gợi ý hướng style, bảng màu và outfit cụ thể cho bạn.
        </p>
        <Link
          href="/stylist"
          className="mt-8 inline-block border border-accent px-8 py-3 font-body text-sm uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-ivory"
        >
          Thử AI phối đồ
        </Link>
      </div>
    </section>
  )
}
