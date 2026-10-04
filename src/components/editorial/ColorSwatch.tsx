import type { Color } from '@/types/content'

export function ColorSwatch({ color }: { color: Color }) {
  return (
    <div>
      <div
        className="aspect-square w-full border border-muted/40"
        style={{ backgroundColor: color.hex }}
        aria-hidden="true"
      />
      <p className="mt-3 font-body text-sm">{color.name}</p>
    </div>
  )
}
