import type { RelatedOutfit } from '@/data'
import { OutfitLook } from '@/components/editorial/OutfitLook'

const GROUP_LABEL: Record<RelatedOutfit['relation'], string> = {
  'contains-item': 'Look có món này',
  'same-style': 'Look cùng hướng style',
}

function Group({
  relation,
  entries,
}: {
  relation: RelatedOutfit['relation']
  entries: RelatedOutfit[]
}) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="border-t border-muted/40 pt-10">
      <h2 className="font-display text-3xl">{GROUP_LABEL[relation]}</h2>
      <div className="mt-8 space-y-16">
        {entries.map(({ outfit }) => (
          <OutfitLook key={outfit.slug} outfit={outfit} />
        ))}
      </div>
    </div>
  )
}

export function RelatedOutfits({ related }: { related: RelatedOutfit[] }) {
  const containsItem = related.filter((entry) => entry.relation === 'contains-item')
  const sameStyle = related.filter((entry) => entry.relation === 'same-style')

  return (
    <div className="space-y-16">
      <Group relation="contains-item" entries={containsItem} />
      <Group relation="same-style" entries={sameStyle} />
    </div>
  )
}
