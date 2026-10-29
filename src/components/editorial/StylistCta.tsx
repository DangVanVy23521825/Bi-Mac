import { CtaLink } from '@/components/ui/CtaLink'

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
        <div className="mt-8">
          <CtaLink href="/stylist">Thử AI phối đồ</CtaLink>
        </div>
      </div>
    </section>
  )
}
