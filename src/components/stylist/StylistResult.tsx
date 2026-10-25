// Presentational — renders whatever has arrived of a `StylistOutcome` (or a
// stage-1-only `AnalysisStage` plus an empty result, from `StylistFlow`
// while the second model call is still in flight). Deliberately holds no
// state and makes no network calls, so its tests need no fetch mocking.
//
// §"affinity là never shown as a percentage": the ranker's `affinity` is an
// internal signal, not an objective measure of a person — rendered as one
// of three qualitative labels below, never a number, never a `%`.
//
// Section order follows `outcome.goal` (set by Task 13's pipeline) so this
// component needs only one prop to decide layout.

import Link from 'next/link'
import type { StylistOutcome } from '@/features/stylist/pipeline'

type StyleDirection = StylistOutcome['styleDirections'][number]
type PaletteEntry = StylistOutcome['palette'][number]
type OutfitEntry = StylistOutcome['outfits'][number]
type ItemEntry = StylistOutcome['items'][number]

function affinityLabel(affinity: number): string {
  if (affinity >= 0.75) {
    return 'rất khớp'
  }
  if (affinity >= 0.5) {
    return 'khớp'
  }
  return 'có thể thử'
}

function DegradedBanner({ degraded }: { degraded: boolean }) {
  if (!degraded) {
    return null
  }
  return (
    <p
      role="status"
      className="border border-muted/40 bg-muted/35 px-4 py-3 font-body text-sm text-accent-soft"
    >
      Đây là gợi ý từ chế độ dự phòng của Bí Mặc (không gọi được AI lúc này) — vẫn lấy từ đúng
      những món Bí Mặc đang có, nhưng phần giải thích có thể đơn giản hơn bình thường.
    </p>
  )
}

function EmptyStateLinks() {
  return (
    <p className="font-body text-sm text-accent-soft">
      Bạn vẫn có thể tự khám phá:{' '}
      <Link href="/styles" className="underline-offset-4 hover:text-accent hover:underline">
        Khám phá theo style
      </Link>{' '}
      hoặc{' '}
      <Link href="/wardrobe" className="underline-offset-4 hover:text-accent hover:underline">
        xem Tủ đồ
      </Link>
      .
    </p>
  )
}

function NotesBlock({ notes }: { notes: string[] }) {
  if (notes.length === 0) {
    return null
  }
  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <p key={note} className="font-body text-sm text-accent-soft">
          {note}
        </p>
      ))}
    </div>
  )
}

function StyleDirectionsSection({ directions }: { directions: StyleDirection[] }) {
  if (directions.length === 0) {
    return null
  }
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl">Hướng style hợp với bạn</h2>
      <ul className="space-y-4">
        {directions.map((direction: StyleDirection) => (
          <li key={direction.slug} className="border-t border-muted/40 pt-4">
            <Link
              href={direction.href}
              className="font-display text-xl text-accent underline-offset-4 hover:underline"
            >
              {direction.name}
            </Link>
            <p className="mt-1 font-body text-xs uppercase tracking-[0.12em] text-accent-soft">
              {affinityLabel(direction.affinity)}
            </p>
            <p className="mt-2 max-w-xl font-body text-sm text-accent-soft">{direction.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PaletteSection({ palette }: { palette: PaletteEntry[] }) {
  if (palette.length === 0) {
    return null
  }
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl">Bảng màu nên thử</h2>
      <ul className="space-y-4">
        {palette.map((entry: PaletteEntry) => (
          <li key={entry.slug} className="flex items-start gap-3 border-t border-muted/40 pt-4">
            <span
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 rounded-full border border-muted/40"
              style={{ backgroundColor: entry.hex }}
            />
            <div>
              <p className="font-body text-sm text-accent-soft">{entry.name}</p>
              <p className="mt-1 max-w-xl font-body text-sm text-accent-soft">{entry.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function OutfitsSection({ outfits }: { outfits: OutfitEntry[] }) {
  if (outfits.length === 0) {
    return null
  }
  return (
    <section className="space-y-8">
      <h2 className="font-display text-2xl">Outfit gợi ý</h2>
      <ul className="space-y-8">
        {outfits.map((outfit: OutfitEntry) => (
          <li key={outfit.slug} className="border-t border-muted/40 pt-6">
            <h3 className="font-display text-xl">{outfit.name}</h3>
            <p className="mt-2 max-w-2xl font-body text-sm text-accent-soft">{outfit.whyThisWorks}</p>
            <ul className="mt-4 flex flex-wrap gap-4">
              {outfit.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    data-testid="recommended-outfit-item"
                    className="font-body text-sm text-accent-soft underline-offset-4 hover:text-accent hover:underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ItemsSection({ items }: { items: ItemEntry[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl">Món nên có trong tủ đồ</h2>
      <ul className="space-y-4">
        {items.map((item: ItemEntry) => (
          <li key={item.slug} className="border-t border-muted/40 pt-4">
            <Link
              href={item.href}
              className="font-display text-lg text-accent underline-offset-4 hover:underline"
            >
              {item.name}
            </Link>
            <p className="mt-1 max-w-xl font-body text-sm text-accent-soft">{item.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

type Props = {
  outcome: StylistOutcome
}

export function StylistResult({ outcome }: Props) {
  const { goal, degraded, styleDirections, palette, outfits, items, notes } = outcome

  const isFullyEmpty =
    styleDirections.length === 0 && palette.length === 0 && outfits.length === 0 && items.length === 0

  const hasAnEmptySection =
    styleDirections.length === 0 || palette.length === 0 || outfits.length === 0 || items.length === 0

  const sections: Record<string, React.ReactNode> = {
    style: <StyleDirectionsSection key="style" directions={styleDirections} />,
    colors: <PaletteSection key="colors" palette={palette} />,
    outfits: <OutfitsSection key="outfits" outfits={outfits} />,
    'wardrobe-refresh': <ItemsSection key="wardrobe-refresh" items={items} />,
  }

  const order: Array<keyof typeof sections> =
    goal === 'style'
      ? ['style', 'colors', 'outfits', 'wardrobe-refresh']
      : goal === 'colors'
        ? ['colors', 'style', 'outfits', 'wardrobe-refresh']
        : goal === 'wardrobe-refresh'
          ? ['wardrobe-refresh', 'style', 'colors', 'outfits']
          : ['outfits', 'style', 'colors', 'wardrobe-refresh']

  return (
    <div className="space-y-10">
      <DegradedBanner degraded={degraded} />
      <NotesBlock notes={notes} />
      {isFullyEmpty ? (
        <EmptyStateLinks />
      ) : (
        <>
          {order.map((key) => sections[key])}
          {hasAnEmptySection && <EmptyStateLinks />}
        </>
      )}
    </div>
  )
}
