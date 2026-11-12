import type { RelatedOutfit } from '@/data'
import { OutfitLook } from '@/components/editorial/OutfitLook'
import type { ToggleSavedResult } from '@/components/closet/SaveButton'

const GROUP_LABEL: Record<RelatedOutfit['relation'], string> = {
  'contains-item': 'Look có món này',
  'same-style': 'Look cùng hướng style',
}

// Cùng kiểu opt-in với `OutfitLookSaveProps`, chỉ khác là dùng cho nhiều
// look một lúc: `savedSlugs` là tập slug người dùng hiện đã lưu (tính một
// lần ở trang gọi, không phải một query riêng cho mỗi look), còn mỗi
// `OutfitLook` tự tra xem slug của chính nó có trong tập đó hay không —
// đây là chỗ test `RelatedOutfits.test.tsx` khoá lại: hai look khác nhau
// trên cùng trang phải nhận đúng trạng thái đã-lưu của riêng nó, không
// phải cùng một giá trị dùng chung.
export type RelatedOutfitsSaveProps = {
  isSignedIn: boolean
  onToggle: (outfitSlug: string) => Promise<ToggleSavedResult>
  savedSlugs: ReadonlySet<string>
}

function Group({
  relation,
  entries,
  save,
}: {
  relation: RelatedOutfit['relation']
  entries: RelatedOutfit[]
  save?: RelatedOutfitsSaveProps
}) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="border-t border-muted/40 pt-10">
      <h2 className="font-display text-3xl">{GROUP_LABEL[relation]}</h2>
      <div className="mt-8 space-y-16">
        {entries.map(({ outfit }) => (
          <OutfitLook
            key={outfit.slug}
            outfit={outfit}
            save={
              save && {
                initialSaved: save.savedSlugs.has(outfit.slug),
                isSignedIn: save.isSignedIn,
                onToggle: save.onToggle,
              }
            }
          />
        ))}
      </div>
    </div>
  )
}

export function RelatedOutfits({
  related,
  save,
}: {
  related: RelatedOutfit[]
  save?: RelatedOutfitsSaveProps
}) {
  const containsItem = related.filter((entry) => entry.relation === 'contains-item')
  const sameStyle = related.filter((entry) => entry.relation === 'same-style')

  return (
    <div className="space-y-16">
      <Group relation="contains-item" entries={containsItem} save={save} />
      <Group relation="same-style" entries={sameStyle} save={save} />
    </div>
  )
}
