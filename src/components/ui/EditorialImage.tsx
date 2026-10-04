import Image from 'next/image'

export type Ratio = 'hero' | 'portrait' | 'look'

const RATIO_CLASS: Record<Ratio, string> = {
  hero: 'aspect-[3/2]',
  portrait: 'aspect-[4/5]',
  look: 'aspect-[3/4]',
}

const RATIO_SIZE: Record<Ratio, { width: number; height: number }> = {
  hero: { width: 1536, height: 1024 },
  portrait: { width: 1024, height: 1280 },
  look: { width: 1024, height: 1365 },
}

type Props = {
  src: string | null
  alt: string
  ratio: Ratio
  priority?: boolean
}

export function EditorialImage({ src, alt, ratio, priority = false }: Props) {
  if (!src) {
    return (
      <div
        data-placeholder="true"
        aria-hidden="true"
        className={`${RATIO_CLASS[ratio]} w-full bg-muted/35`}
      />
    )
  }

  const { width, height } = RATIO_SIZE[ratio]

  return (
    <div className={`${RATIO_CLASS[ratio]} relative w-full overflow-hidden`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none hover:scale-[1.02]"
      />
    </div>
  )
}
