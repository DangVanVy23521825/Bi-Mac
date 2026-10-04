import { SectionHeading } from '@/components/ui/SectionHeading'

export default function StylistPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="AI phối đồ" title="Gợi ý phối đồ cho riêng bạn" />
      <p className="font-body text-base text-accent-soft">
        Bạn trả lời vài câu về dịp mặc, dáng áo bạn thích và những thứ bạn muốn tránh. Bí Mặc
        gợi ý hướng style, bảng màu và các outfit cụ thể lấy từ tủ đồ của trang — kèm lý do vì
        sao chúng hợp với bạn.
      </p>
      <p className="mt-6 font-body text-sm text-accent-soft">
        Ảnh là tuỳ chọn. Nếu bạn gửi ảnh, nó chỉ dùng để phân tích trong lần đó và không được lưu lại.
      </p>
    </div>
  )
}
