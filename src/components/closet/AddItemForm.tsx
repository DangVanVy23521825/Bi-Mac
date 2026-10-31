'use client'

// Thêm một món đồ mới vào tủ: chọn/chụp ảnh -> ảnh lên thẳng bucket `closet`
// từ trình duyệt (không qua route Next nào, xem ghi chú ở `images.ts` và
// quyết định #1 trong brief) -> POST `imagePath` sang `/api/closet/tag` ->
// form hiện ra ĐÃ ĐIỀN, người dùng chỉ việc lướt qua và sửa chỗ sai. Nếu
// gắn nhãn tự động suy giảm (`degradedReason` khác null), route vẫn trả
// 200 với một nhãn rỗng-gần-như-rỗng — form vẫn hiện ra, chỉ kèm một dòng
// nói rõ người dùng sẽ tự điền.
//
// `pendingImagePathRef` theo dõi ảnh đã lên bucket nhưng CHƯA có dòng DB
// nào trỏ tới — tức một món rò rỉ nếu bỏ mặc. Hai lối rò đã chặn ở đây:
// chọn ảnh khác thay cho ảnh đang chờ lưu, và bấm "Huỷ". Lưu thành công
// thì xoá tham chiếu khỏi ref mà KHÔNG xoá file (giờ nó là ảnh thật của
// món đồ). Việc dọn khi người dùng bỏ cả tab nửa chừng (không bấm gì) nằm
// ngoài phạm vi phần này — cần một cơ chế lifecycle/cron ở tầng storage,
// một quyết định sản phẩm khác, không phải vài dòng trong component.

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClosetLabelFields } from './ClosetLabelFields'
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '@/features/stylist/photo-limits'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ClosetItemDraft } from '@/types/closet'

type ActionResult = { ok: true } | { ok: false; error: string }

const MAX_PHOTO_MB = Math.round(MAX_PHOTO_BYTES / 1_000_000)
const BUCKET = 'closet'

function isAllowedPhotoType(value: string): value is (typeof ALLOWED_PHOTO_TYPES)[number] {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(value)
}

// Cùng thứ tự kiểm tra (loại rồi mới tới dung lượng) và cùng giọng văn với
// `Questionnaire.tsx`'s `describePhotoRejection` — chạy trước khi bất cứ
// byte nào rời khỏi trình duyệt, theo đúng quyết định #1.
function describePhotoRejection(file: File): string | undefined {
  if (!isAllowedPhotoType(file.type)) {
    return `Bí Mặc chưa đọc được loại ảnh này${file.type ? ` (${file.type})` : ''}. Hãy chọn ảnh JPEG, PNG hoặc WebP.`
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `Ảnh đang lớn hơn ${MAX_PHOTO_MB}MB cho phép. Hãy chọn một ảnh nhỏ hơn.`
  }
  return undefined
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '-')
}

// Không import `closetImagePath` từ `@/features/closet/images.ts`: file đó
// cũng export `signClosetImage`, thứ kéo theo `createSupabaseServerClient`
// (dùng `next/headers`) — bundler client sẽ kéo cả module đó vào bundle
// trình duyệt và build thất bại ngay (xác nhận bằng `pnpm build` thật),
// dù component này chỉ cần một phép nối chuỗi. Giữ lại chính logic đó
// (`${userId}/${fileName}`) ngay tại đây, cùng lý do `photo-limits.ts`
// tách riêng hằng số khỏi route server của nó.
function closetImagePath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}

type TagResponseBody = {
  tag: Omit<ClosetItemDraft, 'imagePath' | 'labelSource'>
  labelSource: ClosetItemDraft['labelSource']
  degradedReason: string | null
}

type Props = {
  userId: string
  onCreate: (draft: ClosetItemDraft) => Promise<ActionResult>
}

export function AddItemForm({ userId, onCreate }: Props) {
  const router = useRouter()
  const [draft, setDraft] = useState<ClosetItemDraft | null>(null)
  const [photoError, setPhotoError] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [degraded, setDegraded] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()

  // Đường dẫn ảnh đã lên bucket mà chưa có dòng `closet_items` nào tham
  // chiếu tới — `null` khi không có gì đang "treo". Dùng ref, không phải
  // state: không có nhánh render nào phụ thuộc giá trị này.
  const pendingImagePathRef = useRef<string | null>(null)

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const rejection = describePhotoRejection(file)
    if (rejection) {
      setPhotoError(rejection)
      setDraft(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setPhotoError(undefined)
    setSaveError(undefined)
    setDegraded(false)
    setDraft(null)
    setPending(true)

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        setPhotoError('Tính năng này cần Supabase được cấu hình, hiện chưa có.')
        return
      }

      // Ảnh vừa chọn thay cho ảnh trước đó mà chưa kịp lưu — ảnh cũ giờ
      // không còn gì tham chiếu tới, xoá luôn để không rò rỉ trong bucket
      // riêng tư (CLAUDE.md: ảnh người dùng là dữ liệu riêng tư). Không
      // chờ kết quả: đây là dọn dẹp tốt-nhất-có-thể, không phải điều kiện
      // để tiếp tục chọn ảnh mới.
      if (pendingImagePathRef.current) {
        void supabase.storage.from(BUCKET).remove([pendingImagePathRef.current])
        pendingImagePathRef.current = null
      }

      const imagePath = closetImagePath(userId, `${Date.now()}-${sanitizeFileName(file.name)}`)
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(imagePath, file)
      if (uploadError) {
        setPhotoError('Không tải được ảnh lên. Vui lòng thử lại.')
        return
      }
      // Lên bucket thành công — từ đây tới lúc lưu (hoặc Huỷ), ảnh này là
      // một món có thể rò rỉ nếu không ai dọn.
      pendingImagePathRef.current = imagePath

      const response = await fetch('/api/closet/tag', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imagePath }),
      })
      // Route lúc thành công luôn 200 (xem comment đầu file) — một status
      // khác (401 do phiên đăng nhập hết hạn giữa chừng, 400, 5xx…) có
      // thân JSON khác hình dạng `TagResponseBody`, nên bắt ở đây và rơi
      // xuống catch chung thay vì spread một object thiếu field rồi render
      // vỡ `ClosetLabelFields` (nó giả định mọi field trên `draft` luôn có mặt).
      if (!response.ok) {
        throw new Error('closet-tag-request-failed')
      }
      const body = (await response.json()) as TagResponseBody

      setDraft({ ...body.tag, imagePath, labelSource: body.labelSource })
      setDegraded(Boolean(body.degradedReason))
    } catch {
      setPhotoError('Có lỗi khi xử lý ảnh. Vui lòng thử lại.')
    } finally {
      setPending(false)
    }
  }

  function updateDraft(patch: Partial<ClosetItemDraft>) {
    setDraft((current) => (current ? { ...current, ...patch, labelSource: 'user' } : current))
  }

  // Bỏ ảnh/nhãn vừa gắn mà không lưu — ảnh đã lên bucket (nếu có) bị xoá
  // ngay, cùng lý do với nhánh "chọn ảnh khác" ở trên.
  function resetForm() {
    if (pendingImagePathRef.current) {
      const supabase = createSupabaseBrowserClient()
      if (supabase) {
        void supabase.storage.from(BUCKET).remove([pendingImagePathRef.current])
      }
      pendingImagePathRef.current = null
    }
    setDraft(null)
    setDegraded(false)
    setPhotoError(undefined)
    setSaveError(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return

    setSaveError(undefined)
    setSavePending(true)
    const result = await onCreate(draft)
    setSavePending(false)

    if (!result.ok) {
      setSaveError(result.error)
      return
    }

    // Lưu thành công — giờ có một dòng DB trỏ tới ảnh này, không còn là
    // ảnh "treo" nữa. Chỉ bỏ tham chiếu, không xoá file.
    pendingImagePathRef.current = null
    setDraft(null)
    setDegraded(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={ALLOWED_PHOTO_TYPES.join(',')}
          onChange={handlePhotoChange}
          className="peer sr-only"
        />
        <label
          htmlFor={fileInputId}
          className="inline-flex cursor-pointer items-center gap-2.5 border border-accent px-6 py-3 font-body text-xs uppercase tracking-[0.14em] text-accent transition hover:bg-accent hover:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        >
          Chụp hoặc chọn ảnh món đồ
        </label>
        {pending && <span className="font-body text-sm text-accent-soft">Đang đọc ảnh và gợi ý nhãn…</span>}
      </div>

      {photoError && (
        <p role="alert" className="font-body text-sm text-accent">
          {photoError}
        </p>
      )}

      {degraded && (
        <p className="font-body text-sm text-accent-soft">
          Bí Mặc chưa tự gắn nhãn được cho ảnh này — bạn tự điền giúp các nhãn dưới đây nhé, chỉ mất chút thời gian.
        </p>
      )}

      {draft && (
        <form onSubmit={handleSubmit} className="space-y-8 border-t border-muted/40 pt-8">
          <ClosetLabelFields draft={draft} onChange={updateDraft} />

          {saveError && (
            <p role="alert" className="font-body text-sm text-accent">
              {saveError}
            </p>
          )}

          <div className="flex items-center gap-6">
            <button
              type="submit"
              disabled={savePending}
              className="inline-block border border-accent bg-accent px-8 py-3 font-body text-sm uppercase tracking-[0.14em] text-ivory transition hover:bg-accent-soft hover:border-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savePending ? 'Đang lưu…' : 'Lưu vào tủ đồ'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="font-body text-sm text-accent-soft underline underline-offset-4 hover:text-accent"
            >
              Huỷ
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
