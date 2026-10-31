'use client'

// Bộ field dùng chung cho cả "thêm món mới" (`AddItemForm`) và "sửa nhãn
// một món đã lưu" (`ClosetItemCard`) — cùng một bộ control, một chỗ định
// nghĩa, tránh lệch hành vi giữa hai nơi. Tách riêng khỏi cả hai file đó
// (từng sống trong `AddItemForm.tsx`) vì nó là một thành phần hiển thị
// thuần, không liên quan gì đến việc tải ảnh lên hay gọi `/api/closet/tag`
// — `ClosetItemCard` trước đây phải import nó từ `AddItemForm.tsx`, kéo
// theo toàn bộ logic upload mà nó không bao giờ dùng tới.

import { useId } from 'react'
import { allCategories, allColors, allStyles } from '@/data'
import { ATTRIBUTE_LABEL } from '@/components/stylist/Questionnaire'
import { OCCASION_LABEL } from '@/components/wardrobe/ItemFacts'
import { OCCASIONS, type Fit, type ItemAttribute, type Occasion } from '@/types/stylist'
import type { CategorySlug } from '@/types/content'
import type { ClosetItemDraft } from '@/types/closet'

const FIT_VALUES: Fit[] = ['fitted', 'relaxed', 'oversized']
const FIT_LABEL: Record<Fit, string> = {
  fitted: 'Ôm vừa dáng',
  relaxed: 'Rộng vừa phải',
  oversized: 'Rộng thùng, oversized',
}
const ATTRIBUTE_ORDER = Object.keys(ATTRIBUTE_LABEL) as ItemAttribute[]

// Cùng kiểu chip-viền mà `Questionnaire.tsx` dùng (lý do ở comment trong
// file đó: preflight của Tailwind xoá sạch style gốc của input/radio) —
// không import được từ đó (không export), nên định nghĩa lại ở đây.
const CHOICE_CLASS =
  'flex cursor-pointer items-center gap-2.5 border border-muted/50 px-4 py-2.5 font-body text-sm transition hover:border-accent/70 has-[:checked]:border-accent has-[:checked]:bg-accent/5 has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent'
const CHOICE_INPUT_CLASS = 'h-4 w-4 shrink-0 cursor-pointer accent-accent'
const FIELD_LABEL_CLASS = 'font-body text-xs uppercase tracking-[0.18em] text-accent-soft'

export type ClosetLabelFieldsProps = {
  draft: ClosetItemDraft
  onChange: (patch: Partial<ClosetItemDraft>) => void
}

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
