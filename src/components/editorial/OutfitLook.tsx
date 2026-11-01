import { SaveButton, type ToggleSavedResult } from '@/components/closet/SaveButton'
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { Outfit } from '@/types/content'

// `save` là opt-in, không bắt buộc: khi không truyền (trang chủ,
// `src/app/page.tsx`), component render giống như trước Task 8 — không
// thêm gì, không đổi diff của trang đó, không có control lưu nào ở front
// matter biên tập của trang chủ (đúng yêu cầu: look nổi bật ở trang chủ
// không phải là nơi đặt một nút lưu). Khi được truyền (các trang chi tiết
// item/style), render `SaveButton` cùng ngôn ngữ thị giác với nút lưu
// món/style — một chữ gạch chân dưới "Vì sao hợp", không phải một hàng nút
// cạnh ảnh.
export type OutfitLookSaveProps = {
  initialSaved: boolean
  isSignedIn: boolean
  onToggle: (outfitSlug: string) => Promise<ToggleSavedResult>
}

type Props = {
  outfit: Outfit
  save?: OutfitLookSaveProps
}

export function OutfitLook({ outfit, save }: Props) {
  return (
    <article className="grid gap-6 sm:grid-cols-2 sm:items-center">
      <EditorialImage src={outfit.image} alt={outfit.name} ratio="look" />
      <div>
        <h3 className="font-display text-2xl">{outfit.name}</h3>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.16em] text-accent-soft">
          Vì sao hợp
        </p>
        <p className="mt-2 font-body text-sm text-accent-soft">{outfit.whyItWorks}</p>
        {save && (
          <div className="mt-4">
            <SaveButton
              slug={outfit.slug}
              initialSaved={save.initialSaved}
              isSignedIn={save.isSignedIn}
              onToggle={save.onToggle}
            />
          </div>
        )}
      </div>
    </article>
  )
}
