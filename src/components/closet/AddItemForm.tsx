'use client'

// Thêm một món đồ mới vào tủ: chọn/chụp ảnh -> ảnh lên thẳng bucket `closet`
// từ trình duyệt (không qua route Next nào, xem ghi chú ở `images.ts` và
// quyết định #1 trong brief) -> POST `imagePath` sang `/api/closet/tag` ->
// form hiện ra ĐÃ ĐIỀN, người dùng chỉ việc lướt qua và sửa chỗ sai. Nếu
// gắn nhãn tự động suy giảm (`degradedReason` khác null), route vẫn trả
// 200 với một nhãn rỗng-gần-như-rỗng — form vẫn hiện ra, chỉ kèm một dòng
// nói rõ người dùng sẽ tự điền.
//
// `ClosetLabelFields` (export cùng file) là phần field dùng lại ở
// `ClosetItemCard` khi sửa nhãn một món đã lưu — cùng một bộ control, một
// chỗ định nghĩa, tránh lệch hành vi giữa "thêm mới" và "sửa".

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { allCategories, allColors, allStyles } from '@/data'
import { ATTRIBUTE_LABEL } from '@/components/stylist/Questionnaire'
import { OCCASION_LABEL } from '@/components/wardrobe/ItemFacts'
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '@/features/stylist/photo-limits'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { OCCASIONS, type Fit, type ItemAttribute, type Occasion } from '@/types/stylist'
import type { CategorySlug } from '@/types/content'
import type { ClosetItemDraft } from '@/types/closet'

type ActionResult = { ok: true } | { ok: false; error: string }

const FIT_VALUES: Fit[] = ['fitted', 'relaxed', 'oversized']
const FIT_LABEL: Record<Fit, string> = {
  fitted: 'Ôm vừa dáng',
  relaxed: 'Rộng vừa phải',
  oversized: 'Rộng thùng, oversized',
}
const ATTRIBUTE_ORDER = Object.keys(ATTRIBUTE_LABEL) as ItemAttribute[]
const MAX_PHOTO_MB = Math.round(MAX_PHOTO_BYTES / 1_000_000)

// Cùng kiểu chip-viền mà `Questionnaire.tsx` dùng (lý do ở comment trong
// file đó: preflight của Tailwind xoá sạch style gốc của input/radio) —
// không import được từ đó (không export), nên định nghĩa lại ở đây.
const CHOICE_CLASS =
  'flex cursor-pointer items-center gap-2.5 border border-muted/50 px-4 py-2.5 font-body text-sm transition hover:border-accent/70 has-[:checked]:border-accent has-[:checked]:bg-accent/5 has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent'
const CHOICE_INPUT_CLASS = 'h-4 w-4 shrink-0 cursor-pointer accent-accent'
const FIELD_LABEL_CLASS = 'font-body text-xs uppercase tracking-[0.18em] text-accent-soft'

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

export type ClosetLabelFieldsProps = {
  draft: ClosetItemDraft
  onChange: (patch: Partial<ClosetItemDraft>) => void
}

// Bộ field dùng chung cho cả "thêm món mới" và "sửa nhãn một món đã lưu".
export function ClosetLabelFields({ draft, onChange }: ClosetLabelFieldsProps) {
  const uid = useId()

  function toggleSlug(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((entry) => entry !== slug) : [...list, slug]
  }

  function toggleOccasion(occasion: Occasion) {
    onChange({
      occasions: draft.occasions.includes(occasion)
        ? draft.occasions.filter((entry) => entry !== occasion)
        : [...draft.occasions, occasion],
    })
  }

  function toggleAttribute(attribute: ItemAttribute) {
    onChange({
      attributes: draft.attributes.includes(attribute)
        ? draft.attributes.filter((entry) => entry !== attribute)
        : [...draft.attributes, attribute],
    })
  }

  return (
    <div className="space-y-7">
      <div>
        <label htmlFor={`${uid}-name`} className={FIELD_LABEL_CLASS}>
          Tên món đồ
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className="mt-2 w-full border border-muted/50 bg-transparent px-4 py-2.5 font-body text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Loại trang phục</legend>
        <div className="flex flex-wrap gap-3">
          {allCategories.map((category) => (
            <label key={category.slug} className={CHOICE_CLASS}>
              <input
                type="radio"
                name={`${uid}-category`}
                className={CHOICE_INPUT_CLASS}
                checked={draft.category === category.slug}
                onChange={() => onChange({ category: category.slug as CategorySlug })}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Màu</legend>
        <div className="flex flex-wrap gap-3">
          {allColors.map((color) => (
            <label key={color.slug} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                className={CHOICE_INPUT_CLASS}
                checked={draft.colorSlugs.includes(color.slug)}
                onChange={() => onChange({ colorSlugs: toggleSlug(draft.colorSlugs, color.slug) })}
              />
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted/40"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Phong cách</legend>
        <div className="flex flex-wrap gap-3">
          {allStyles.map((style) => (
            <label key={style.slug} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                className={CHOICE_INPUT_CLASS}
                checked={draft.styleSlugs.includes(style.slug)}
                onChange={() => onChange({ styleSlugs: toggleSlug(draft.styleSlugs, style.slug) })}
              />
              {style.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Dịp mặc</legend>
        <div className="flex flex-wrap gap-3">
          {OCCASIONS.map((occasion) => (
            <label key={occasion} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                className={CHOICE_INPUT_CLASS}
                checked={draft.occasions.includes(occasion)}
                onChange={() => toggleOccasion(occasion)}
              />
              {OCCASION_LABEL[occasion]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Dáng</legend>
        <div className="flex flex-wrap gap-3">
          <label className={CHOICE_CLASS}>
            <input
              type="radio"
              name={`${uid}-fit`}
              className={CHOICE_INPUT_CLASS}
              checked={draft.fit === null}
              onChange={() => onChange({ fit: null })}
            />
            Chưa rõ
          </label>
          {FIT_VALUES.map((fit) => (
            <label key={fit} className={CHOICE_CLASS}>
              <input
                type="radio"
                name={`${uid}-fit`}
                className={CHOICE_INPUT_CLASS}
                checked={draft.fit === fit}
                onChange={() => onChange({ fit })}
              />
              {FIT_LABEL[fit]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={FIELD_LABEL_CLASS}>Đặc điểm</legend>
        <div className="flex flex-wrap gap-3">
          {ATTRIBUTE_ORDER.map((attribute) => (
            <label key={attribute} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                className={CHOICE_INPUT_CLASS}
                checked={draft.attributes.includes(attribute)}
                onChange={() => toggleAttribute(attribute)}
              />
              {ATTRIBUTE_LABEL[attribute]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-note`} className={FIELD_LABEL_CLASS}>
          Ghi chú (tuỳ chọn)
        </label>
        <textarea
          id={`${uid}-note`}
          value={draft.note ?? ''}
          onChange={(event) => onChange({ note: event.target.value.length > 0 ? event.target.value : null })}
          rows={2}
          className="mt-2 w-full border border-muted/50 bg-transparent px-4 py-2.5 font-body text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>
    </div>
  )
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

      const imagePath = closetImagePath(userId, `${Date.now()}-${sanitizeFileName(file.name)}`)
      const { error: uploadError } = await supabase.storage.from('closet').upload(imagePath, file)
      if (uploadError) {
        setPhotoError('Không tải được ảnh lên. Vui lòng thử lại.')
        return
      }

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

          <button
            type="submit"
            disabled={savePending}
            className="inline-block border border-accent bg-accent px-8 py-3 font-body text-sm uppercase tracking-[0.14em] text-ivory transition hover:bg-accent-soft hover:border-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? 'Đang lưu…' : 'Lưu vào tủ đồ'}
          </button>
        </form>
      )}
    </div>
  )
}
