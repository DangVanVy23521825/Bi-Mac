// `/closet/items` — nơi một món đồ thật trở thành dữ liệu AI Stylist dùng
// được. Trang này nằm trong route group `(account)` (ADR-021) nên lớp
// signed-out/unconfigured đã được `layout.tsx` xử lý; trang chỉ cần lo
// phần của người đã đăng nhập — nhưng vẫn tự gọi `requireUserId()`, không
// dựa vào việc layout "đã chặn" làm điều kiện để fetch dữ liệu cá nhân
// (ADR-021: gate của layout chỉ là ranh giới UI, không phải ranh giới dữ
// liệu, vì Next bake luôn RSC payload của nhánh bị ẩn vào segment cache).
//
// Ba Server Action (thêm/sửa/xoá) sống ở `./actions.ts`, không phải
// closure lồng ngay trong file này — xem comment đầu file đó để biết vì
// sao (ngắn gọn: test được bằng Vitest mà không phải render cả trang).
import { AddItemForm } from '@/components/closet/AddItemForm'
import { ClosetItemCard } from '@/components/closet/ClosetItemCard'
import { EmptyCloset } from '@/components/closet/EmptyCloset'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { requireUserId } from '@/features/account/guard'
import { signClosetImage } from '@/features/closet/images'
import { listClosetItems } from '@/features/closet/repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createItemAction, deleteItemAction, updateItemAction } from './actions'

export default async function ClosetItemsPage() {
  const userId = await requireUserId()
  const supabase = await createSupabaseServerClient()

  const items = supabase ? await listClosetItems(supabase, userId) : []
  const imageUrls = await Promise.all(items.map((item) => signClosetImage(item.imagePath)))

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Thêm một món đồ" />
      <p className="max-w-xl font-body text-base text-accent-soft">
        Chụp hoặc chọn một ảnh — Bí Mặc đọc ảnh và điền sẵn tên, loại, màu và phong cách.
        Bạn chỉ cần lướt qua, sửa chỗ chưa đúng rồi lưu lại.
      </p>
      <div className="mt-8">
        <AddItemForm userId={userId} onCreate={createItemAction} />
      </div>

      <div className="mt-20">
        {items.length === 0 ? (
          <EmptyCloset />
        ) : (
          <>
            <SectionHeading eyebrow={`${items.length} món đã lưu`} title="Tủ đồ của bạn" />
            <div className="space-y-12">
              {items.map((item, index) => (
                <ClosetItemCard
                  key={item.id}
                  item={item}
                  imageUrl={imageUrls[index] ?? null}
                  index={index}
                  onUpdate={updateItemAction}
                  onDelete={deleteItemAction}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
