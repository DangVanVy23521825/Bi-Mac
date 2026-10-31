// `/closet/items` — nơi một món đồ thật trở thành dữ liệu AI Stylist dùng
// được. Trang này nằm trong route group `(account)` (ADR-021) nên lớp
// signed-out/unconfigured đã được `layout.tsx` xử lý; trang chỉ cần lo
// phần của người đã đăng nhập — nhưng vẫn tự gọi `requireUserId()`, không
// dựa vào việc layout "đã chặn" làm điều kiện để fetch dữ liệu cá nhân
// (ADR-021: gate của layout chỉ là ranh giới UI, không phải ranh giới dữ
// liệu, vì Next bake luôn RSC payload của nhánh bị ẩn vào segment cache).
//
// Ba Server Action (`createItemAction`/`updateItemAction`/`deleteItemAction`)
// định nghĩa ngay trong file này — không qua một route API riêng — vì chưa
// có route nào cho CRUD tủ đồ (Task 6 chỉ thêm `/api/closet/tag`), và đây
// là cách Next.js App Router làm CRUD từ Server Component mà không cần tự
// dựng một route handler mới. Mỗi action tự gọi lại `requireUserId()`
// chứ không dùng `userId` đóng từ closure của hàm trang — cùng triết lý
// "phòng thủ theo lớp" mà `repository.ts` áp cho `.eq('user_id', …)` trên
// mọi câu truy vấn.
import { revalidatePath } from 'next/cache'

import { AddItemForm } from '@/components/closet/AddItemForm'
import { ClosetItemCard } from '@/components/closet/ClosetItemCard'
import { EmptyCloset } from '@/components/closet/EmptyCloset'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { requireUserId } from '@/features/account/guard'
import { signClosetImage } from '@/features/closet/images'
import { closetItemDraftSchema } from '@/features/closet/schema'
import { createClosetItem, deleteClosetItem, listClosetItems, updateClosetItem } from '@/features/closet/repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ClosetItemDraft } from '@/types/closet'

const PATH = '/closet/items'

type ActionResult = { ok: true } | { ok: false; error: string }

const CONFIG_ERROR = 'Tính năng này cần Supabase được cấu hình, hiện chưa có.'

async function createItemAction(draft: ClosetItemDraft): Promise<ActionResult> {
  'use server'
  const userId = await requireUserId()

  const parsed = closetItemDraftSchema.safeParse(draft)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.' }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  await createClosetItem(supabase, userId, parsed.data)
  revalidatePath(PATH)
  return { ok: true }
}

async function updateItemAction(id: string, patch: Partial<ClosetItemDraft>): Promise<ActionResult> {
  'use server'
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  const updated = await updateClosetItem(supabase, userId, id, patch)
  if (!updated) return { ok: false, error: 'Không thể lưu thay đổi cho món đồ này. Vui lòng thử lại.' }

  revalidatePath(PATH)
  return { ok: true }
}

async function deleteItemAction(id: string): Promise<ActionResult> {
  'use server'
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  const deleted = await deleteClosetItem(supabase, userId, id)
  if (!deleted) return { ok: false, error: 'Không thể xoá món đồ này. Vui lòng thử lại.' }

  revalidatePath(PATH)
  return { ok: true }
}

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
