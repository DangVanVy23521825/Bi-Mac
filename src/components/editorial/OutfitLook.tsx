import { EditorialImage } from '@/components/ui/EditorialImage'
import type { Outfit } from '@/types/content'

export function OutfitLook({ outfit }: { outfit: Outfit }) {
  return (
    <article className="grid gap-6 sm:grid-cols-2 sm:items-center">
      <EditorialImage src={outfit.image} alt={outfit.name} ratio="look" />
      <div>
        <h3 className="font-display text-2xl">{outfit.name}</h3>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.16em] text-accent-soft">
          Vì sao hợp
        </p>
        <p className="mt-2 font-body text-sm text-accent-soft">{outfit.whyItWorks}</p>
      </div>
    </article>
  )
}
