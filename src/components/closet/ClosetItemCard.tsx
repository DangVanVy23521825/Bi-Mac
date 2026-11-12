'use client'

// Một món đã lưu trong tủ. Bố cục lấy nguyên zig-zag ảnh/chữ của
// `CategoryItemRow.tsx` (trang `/wardrobe/[category]`) thay vì một thẻ
// vuông kiểu "card + nút sửa" — đây chính là phần brief cảnh báo: màn
// hình quản lý dễ trôi về hướng dashboard nhất, nên mượn lại nhịp điệu
// biên tập đã có sẵn trong app thay vì bày thêm một mẫu card mới.
//
// Hai hành động — sửa nhãn (dùng lại `ClosetLabelFields`, cùng một bộ
// control với lúc thêm mới) và xoá. Xoá luôn đi qua một bước xác nhận
// dựng ngay trong hàng (quyết định #6 — không dùng `window.confirm`).
//
// `onUpdate` nhận nguyên một `ClosetItemDraft` đầy đủ, không phải
// `Partial` — `draft` ở component này luôn là bản đầy đủ (khởi tạo từ
// `toDraft(item)` rồi chỉnh dần), nên kiểu tham số phản ánh đúng thứ thực
// sự được gửi đi, và phía nhận (`updateItemAction`) có thể chạy
// `closetItemDraftSchema` — đúng cổng validate mà `createItemAction` cũng
// dùng — mà không phải lo một patch thật-sự-partial thiếu field bắt buộc.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClosetLabelFields } from './ClosetLabelFields'
import { allCategories } from '@/data'
import type { ClosetItem, ClosetItemDraft } from '@/types/closet'

type ActionResult = { ok: true } | { ok: false; error: string }

type Props = {
  item: ClosetItem
  imageUrl: string | null
  index: number
  onUpdate: (id: string, draft: ClosetItemDraft) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}

function toDraft(item: ClosetItem): ClosetItemDraft {
  return {
    name: item.name,
    imagePath: item.imagePath,
    category: item.category,
    colorSlugs: item.colorSlugs,
    styleSlugs: item.styleSlugs,
    occasions: item.occasions,
    fit: item.fit,
    attributes: item.attributes,
    note: item.note,
    labelSource: item.labelSource,
  }
}

function ClosetItemImage({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  return (
    <div className="aspect-[4/5] w-full overflow-hidden bg-muted/35">
      {imageUrl ? (
        // Signed URL hết hạn sau ít phút và không phải asset tĩnh của
        // catalog — next/image không tối ưu được nó, chỉ thêm một vòng
        // loader thừa. Cùng cách Questionnaire.tsx xử lý ảnh xem trước.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="h-full w-full" />
      )}
    </div>
  )
}

export function ClosetItemCard({ item, imageUrl, index, onUpdate, onDelete }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ClosetItemDraft>(() => toDraft(item))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)

  const categoryName = allCategories.find((category) => category.slug === item.category)?.name ?? item.category

  function startEdit() {
    setDraft(toDraft(item))
    setError(undefined)
    setEditing(true)
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setPending(true)
    const result = await onUpdate(item.id, draft)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function handleConfirmDelete() {
    setError(undefined)
    setPending(true)
    const result = await onDelete(item.id)
    setPending(false)

    if (!result.ok) {
      // Giữ nguyên `confirmingDelete = true` — thông báo lỗi render ngay
      // trong khối xác nhận này (bên dưới); đóng khối lại ở đây sẽ làm lỗi
      // không bao giờ lên màn hình, coi như xoá thất bại mà im lặng quay
      // về hàng bình thường.
      setError(result.error)
      return
    }
    router.refresh()
  }

  // Khi sửa, bộ field (tên, loại, màu, phong cách, dịp, dáng, đặc điểm,
  // ghi chú) cần đủ chiều ngang để không bị bóp lại trong 3/5 cột — nên
  // thoát khỏi lưới zig-zag, chiếm toàn bộ hàng, thay vì nhồi vào đúng chỗ
  // tên món đồ vừa đứng.
  if (editing) {
    return (
      <article className="border-t border-muted/40 pt-10 first:border-t-0 first:pt-0">
        <form onSubmit={handleSave} className="space-y-7">
          <ClosetLabelFields
            draft={draft}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch, labelSource: 'user' }))}
          />

          {error && (
            <p role="alert" className="font-body text-sm text-accent">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={pending}
              className="border border-accent bg-accent px-6 py-2.5 font-body text-xs uppercase tracking-[0.14em] text-ivory transition hover:bg-accent-soft hover:border-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Đang lưu…' : 'Lưu'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="font-body text-xs uppercase tracking-[0.14em] text-accent-soft underline underline-offset-4 hover:text-accent"
            >
              Huỷ
            </button>
          </div>
        </form>
      </article>
    )
  }

  const offset = index % 2

  return (
    <article
      data-offset={offset}
      className={`grid gap-6 border-t border-muted/40 pt-10 first:border-t-0 first:pt-0 sm:grid-cols-5 sm:items-center ${
        offset === 1 ? 'sm:[&>:first-child]:order-2' : ''
      }`}
    >
      <div className="sm:col-span-2">
        <ClosetItemImage imageUrl={imageUrl} alt={item.name} />
      </div>

      <div className="space-y-4 sm:col-span-3">
        <h3 className="font-display text-2xl">{item.name}</h3>
        <p className="font-body text-sm text-accent-soft">{categoryName}</p>

        <div className="flex gap-5">
          <button
            type="button"
            onClick={startEdit}
            className="font-body text-sm text-accent underline underline-offset-4 hover:text-accent-soft"
          >
            Sửa nhãn
          </button>
          {!confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="font-body text-sm text-accent-soft underline underline-offset-4 hover:text-accent"
            >
              Xoá
            </button>
          )}
        </div>

        {confirmingDelete && (
          <div className="max-w-md space-y-3 border border-muted/50 p-4">
            <p className="font-body text-sm">
              Xoá &ldquo;{item.name}&rdquo; khỏi tủ đồ? Không thể hoàn tác.
            </p>
            {error && (
              <p role="alert" className="font-body text-sm text-accent">
                {error}
              </p>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={pending}
                className="border border-accent px-5 py-2 font-body text-xs uppercase tracking-[0.14em] text-accent transition hover:bg-accent hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Đang xoá…' : 'Xác nhận xoá'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="font-body text-xs uppercase tracking-[0.14em] text-accent-soft underline underline-offset-4 hover:text-accent"
              >
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
