type Props = {
  eyebrow: string
  title: string
}

export function SectionHeading({ eyebrow, title }: Props) {
  return (
    <div className="mb-10 border-t border-muted/40 pt-6">
      <p className="font-body text-xs uppercase tracking-[0.18em] text-accent-soft">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-normal sm:text-4xl">{title}</h2>
    </div>
  )
}
