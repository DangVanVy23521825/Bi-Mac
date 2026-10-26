'use client'

// Bốn nhóm câu hỏi của AI Stylist (docs/05_AI_STYLIST_SPEC.md §"Required
// questionnaire fields"): dịp mặc (checkbox, bắt buộc ít nhất một), dáng áo
// (radio, có "Chưa chắc"), muốn tránh (checkbox dựng từ `avoidOptions` — chỉ
// những giá trị catalog hiện tại tôn trọng được), và mục tiêu (radio, bốn
// lựa chọn cố định theo `StylistAnswers['goal']`).
//
// Nhãn tiếng Việt cho `ItemAttribute` chốt tại đây — đây là định nghĩa duy
// nhất, đừng chép lại nơi khác.

import { useEffect, useId, useRef, useState } from 'react'
import { OCCASIONS, type Fit, type ItemAttribute, type Occasion, type StylistAnswers } from '@/types/stylist'
import { OCCASION_LABEL } from '@/components/wardrobe/ItemFacts'
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '@/features/stylist/photo-limits'

export const ATTRIBUTE_LABEL: Record<ItemAttribute, string> = {
  sheer: 'Chất liệu mỏng, nhìn xuyên',
  sleeveless: 'Áo/váy sát nách',
  clingy: 'Đồ bám sát cơ thể',
  'structured-shoulder': 'Vai cứng, có cấu trúc',
  cropped: 'Áo croptop',
  'high-heel': 'Cao gót',
  'short-hem': 'Váy ngắn',
  'bright-color': 'Màu rực',
}

// Checkbox order on the form — derived from `OCCASIONS` (the single
// source of truth in `src/types/stylist.ts`) so adding a new `Occasion`
// value automatically gets a checkbox instead of silently staying off
// the form.
const OCCASION_ORDER = OCCASIONS

const FIT_OPTIONS: Array<{ value: Fit | 'unsure'; label: string }> = [
  { value: 'fitted', label: 'Ôm vừa dáng' },
  { value: 'relaxed', label: 'Rộng vừa phải' },
  { value: 'oversized', label: 'Rộng thùng, oversized' },
  { value: 'unsure', label: 'Chưa chắc' },
]

const GOAL_OPTIONS: Array<{ value: StylistAnswers['goal']; label: string }> = [
  { value: 'style', label: 'Tìm phong cách của mình' },
  { value: 'outfits', label: 'Lên outfit cụ thể' },
  { value: 'colors', label: 'Tìm bảng màu hợp' },
  { value: 'wardrobe-refresh', label: 'Làm mới tủ đồ hiện có' },
]

// Tailwind preflight xoá viền/padding của mọi control gốc, nên checkbox,
// radio và nút của `<input type="file">` đều render thành chữ trơn trên nền
// ivory — không còn gì cho biết đó là thứ bấm được. Mỗi lựa chọn giờ là một
// chip có viền, tô lại khi được chọn; `has-[:checked]` giữ nguyên input thật
// làm nguồn trạng thái duy nhất nên hành vi bàn phím và trình đọc màn hình
// không đổi so với control gốc.
const CHOICE_CLASS =
  'flex cursor-pointer items-center gap-2.5 border border-muted/50 px-4 py-2.5 font-body text-sm transition hover:border-accent/70 has-[:checked]:border-accent has-[:checked]:bg-accent/5 has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent'

const CHOICE_INPUT_CLASS = 'h-4 w-4 shrink-0 cursor-pointer accent-accent'

const ACCEPTED_PHOTO_TYPES = ALLOWED_PHOTO_TYPES.join(',')
const MAX_PHOTO_MB = Math.round(MAX_PHOTO_BYTES / 1_000_000)

function isAllowedPhotoType(value: string): value is (typeof ALLOWED_PHOTO_TYPES)[number] {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(value)
}

// Mirrors the route's own validation order (type, then size — see
// `src/app/api/stylist/route.ts`) so a rejected photo is explained here,
// before any request leaves the browser, instead of surfacing later as a
// 413/415 that `StylistFlow` would otherwise have to translate. Each
// message says what to do next, not just what failed — an iPhone HEIC or
// an ordinary 5MB phone photo should never read like a flaky network.
function describePhotoRejection(file: File): string | undefined {
  if (!isAllowedPhotoType(file.type)) {
    return `Bí Mặc chưa đọc được loại ảnh này${file.type ? ` (${file.type})` : ''}. Hãy chọn ảnh JPEG, PNG hoặc WebP — nhiều điện thoại lưu ảnh ở định dạng khác (ví dụ HEIC) nên có thể cần đổi định dạng trước khi tải lên.`
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `Ảnh đang lớn hơn ${MAX_PHOTO_MB}MB cho phép. Hãy chọn một ảnh nhỏ hơn, hoặc chụp/xuất lại ở độ phân giải thấp hơn trước khi tải lên.`
  }
  return undefined
}

export type QuestionnaireSubmission = {
  answers: StylistAnswers
  photo?: File
}

type Props = {
  avoidOptions: ItemAttribute[]
  onSubmit: (submission: QuestionnaireSubmission) => void
  pending: boolean
}

export function Questionnaire({ avoidOptions, onSubmit, pending }: Props) {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [fitPreference, setFitPreference] = useState<Fit | 'unsure'>('unsure')
  const [avoids, setAvoids] = useState<ItemAttribute[]>([])
  const [goal, setGoal] = useState<StylistAnswers['goal']>('style')
  const [photo, setPhoto] = useState<File | undefined>(undefined)
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | undefined>(undefined)
  const [occasionError, setOccasionError] = useState(false)

  const photoInputId = useId()
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Blob URL đang treo, giữ ngoài state để lúc unmount còn thu hồi được —
  // ADR-012: ảnh của người dùng không giữ lại quá lượt này, kể cả dưới dạng
  // một blob URL bị bỏ quên.
  const photoPreviewRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current)
      }
    }
  }, [])

  // Bản xem trước là tuỳ chọn, không phải điều kiện để chọn được ảnh: môi
  // trường test không dựng được object URL từ `File` của jsdom
  // (`createObjectURL` có mặt nhưng ném `ERR_INVALID_ARG_TYPE`), nên chỗ này
  // bắt lỗi thay vì chỉ kiểm tra API có tồn tại. Thiếu thumbnail thì mất
  // thumbnail, không được phép làm hỏng cả form chọn ảnh.
  //
  // Dựng URL ngay trong handler thay vì trong một effect theo dõi `photo`:
  // đây là một side effect của hành động chọn file, không phải việc đồng bộ
  // state với hệ thống ngoài.
  function showPreviewFor(file: File | undefined) {
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current)
      photoPreviewRef.current = undefined
    }

    if (!file) {
      setPhotoPreview(undefined)
      return
    }

    try {
      const objectUrl = URL.createObjectURL(file)
      photoPreviewRef.current = objectUrl
      setPhotoPreview(objectUrl)
    } catch {
      setPhotoPreview(undefined)
    }
  }

  function toggleOccasion(value: Occasion) {
    setOccasions((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    )
  }

  function toggleAvoid(value: ItemAttribute) {
    setAvoids((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    )
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setPhoto(undefined)
      setPhotoError(undefined)
      showPreviewFor(undefined)
      return
    }

    const rejection = describePhotoRejection(file)
    if (rejection) {
      setPhoto(undefined)
      setPhotoError(rejection)
      showPreviewFor(undefined)
      // Clear the native input too — otherwise the browser still shows the
      // rejected filename next to a field we've told the user to redo.
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
      return
    }

    setPhotoError(undefined)
    setPhoto(file)
    showPreviewFor(file)
  }

  function clearPhoto() {
    setPhoto(undefined)
    setPhotoError(undefined)
    showPreviewFor(undefined)
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (occasions.length === 0) {
      setOccasionError(true)
      return
    }
    setOccasionError(false)

    const answers: StylistAnswers = { occasions, fitPreference, avoids, goal }
    onSubmit(photo ? { answers, photo } : { answers })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <fieldset className="space-y-4">
        <legend className="font-display text-xl">Dịp mặc</legend>
        <p className="font-body text-sm text-accent-soft">Chọn ít nhất một dịp bạn hay cần phối đồ.</p>
        <div className="flex flex-wrap gap-4">
          {OCCASION_ORDER.map((occasion) => (
            <label key={occasion} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                className={CHOICE_INPUT_CLASS}
                checked={occasions.includes(occasion)}
                onChange={() => toggleOccasion(occasion)}
              />
              {OCCASION_LABEL[occasion]}
            </label>
          ))}
        </div>
        {occasionError && (
          <p role="alert" className="font-body text-sm text-accent">
            Hãy chọn ít nhất một dịp mặc trước khi xem gợi ý.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl">Dáng áo bạn thích</legend>
        <div className="flex flex-wrap gap-4">
          {FIT_OPTIONS.map((option) => (
            <label key={option.value} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="fitPreference"
                className={CHOICE_INPUT_CLASS}
                checked={fitPreference === option.value}
                onChange={() => setFitPreference(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {avoidOptions.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="font-display text-xl">Muốn tránh</legend>
          <div className="flex flex-wrap gap-4">
            {avoidOptions.map((attribute) => (
              <label key={attribute} className={CHOICE_CLASS}>
                <input
                  type="checkbox"
                  className={CHOICE_INPUT_CLASS}
                  checked={avoids.includes(attribute)}
                  onChange={() => toggleAvoid(attribute)}
                />
                {ATTRIBUTE_LABEL[attribute]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-4">
        <legend className="font-display text-xl">Mục tiêu lần này</legend>
        <div className="flex flex-wrap gap-4">
          {GOAL_OPTIONS.map((option) => (
            <label key={option.value} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="goal"
                className={CHOICE_INPUT_CLASS}
                checked={goal === option.value}
                onChange={() => setGoal(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-muted/40 pt-8">
        <legend className="font-display text-xl">Ảnh (tuỳ chọn)</legend>
        <p className="max-w-xl font-body text-sm text-accent-soft">
          Một ảnh chụp cả người giúp Bí Mặc đọc thêm dáng và tông màu bạn hay mặc. Bỏ qua
          vẫn có gợi ý đầy đủ.
        </p>

        {/* Input thật bị ẩn khỏi mắt thường chứ không bị tắt: nó vẫn nhận
            focus bàn phím, vẫn là thứ trình đọc màn hình đọc được, và vẫn
            là nơi `handlePhotoChange` gắn vào. Cái nhìn thấy là `<label>`
            ngay sau nó — nhờ vậy chữ trên nút là chữ tiếng Việt của Bí Mặc
            thay vì chữ "Chọn tệp" do trình duyệt tự đặt theo locale, thứ
            không style được. `peer` cần input là anh em ruột liền kề của
            label nên hai thẻ phải nằm cùng một div. */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={photoInputRef}
            id={photoInputId}
            type="file"
            accept={ACCEPTED_PHOTO_TYPES}
            onChange={handlePhotoChange}
            className="peer sr-only"
          />
          <label
            htmlFor={photoInputId}
            className="inline-flex cursor-pointer items-center gap-2.5 border border-accent px-6 py-3 font-body text-xs uppercase tracking-[0.14em] text-accent transition hover:bg-accent hover:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M10 13V3.5m0 0L6.8 6.7M10 3.5l3.2 3.2" />
              <path d="M3.5 12.5V15a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
            </svg>
            Thêm một ảnh
          </label>

          {photo && (
            <button
              type="button"
              onClick={clearPhoto}
              className="font-body text-sm text-accent-soft underline underline-offset-4 transition hover:text-accent"
            >
              Bỏ ảnh
            </button>
          )}
        </div>

        {photo && (
          <div className="flex items-center gap-4">
            {photoPreview && (
              // Blob URL cục bộ, không phải asset của catalog — `next/image`
              // không tối ưu được nó và sẽ chỉ thêm một vòng loader thừa.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt={`Ảnh bạn vừa chọn: ${photo.name}`}
                className="h-20 w-16 shrink-0 border border-muted/40 object-cover"
              />
            )}
            <span className="font-body text-sm text-accent-soft">{photo.name}</span>
          </div>
        )}

        {photoError && (
          <p role="alert" className="max-w-xl font-body text-sm text-accent">
            {photoError}
          </p>
        )}

        <p className="font-body text-xs text-accent-soft">
          Ảnh sẽ được gửi tới Google để phân tích trong lần này và không được lưu lại sau đó.
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="inline-block border border-accent px-8 py-3 font-body text-sm uppercase tracking-[0.14em] text-accent transition hover:bg-accent hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Đang tạo gợi ý…' : 'Xem gợi ý'}
      </button>
    </form>
  )
}
