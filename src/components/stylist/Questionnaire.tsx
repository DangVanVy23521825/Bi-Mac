'use client'

// Bốn nhóm câu hỏi của AI Stylist (docs/05_AI_STYLIST_SPEC.md §"Required
// questionnaire fields"): dịp mặc (checkbox, bắt buộc ít nhất một), dáng áo
// (radio, có "Chưa chắc"), muốn tránh (checkbox dựng từ `avoidOptions` — chỉ
// những giá trị catalog hiện tại tôn trọng được), và mục tiêu (radio, bốn
// lựa chọn cố định theo `StylistAnswers['goal']`).
//
// Nhãn tiếng Việt cho `ItemAttribute` chốt tại đây — đây là định nghĩa duy
// nhất, đừng chép lại nơi khác.

import { useId, useState } from 'react'
import type { Fit, ItemAttribute, Occasion, StylistAnswers } from '@/types/stylist'
import { OCCASION_LABEL } from '@/components/wardrobe/ItemFacts'

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

const OCCASION_ORDER: Occasion[] = ['work', 'school', 'casual', 'date', 'event']

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

const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp'

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
  const [occasionError, setOccasionError] = useState(false)

  const photoInputId = useId()

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
    setPhoto(file)
  }

  function clearPhoto() {
    setPhoto(undefined)
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
            <label key={occasion} className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
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
            <label key={option.value} className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="fitPreference"
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
              <label key={attribute} className="flex items-center gap-2 font-body text-sm">
                <input
                  type="checkbox"
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
            <label key={option.value} className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="goal"
                checked={goal === option.value}
                onChange={() => setGoal(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-muted/40 pt-8">
        <legend className="font-display text-xl">Ảnh (tuỳ chọn)</legend>
        <label htmlFor={photoInputId} className="block font-body text-sm">
          Thêm một ảnh để Bí Mặc tham khảo thêm, nếu bạn muốn.
        </label>
        <input
          id={photoInputId}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES}
          onChange={handlePhotoChange}
          className="block w-full max-w-full"
        />
        {photo && (
          <div className="flex items-center gap-3 font-body text-sm text-accent-soft">
            <span>Đã chọn: {photo.name}</span>
            <button
              type="button"
              onClick={clearPhoto}
              className="underline-offset-4 hover:text-accent hover:underline"
            >
              Bỏ ảnh
            </button>
          </div>
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
