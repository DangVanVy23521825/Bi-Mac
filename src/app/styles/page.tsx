import { SectionHeading } from '@/components/ui/SectionHeading'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { getStyles } from '@/data'

export default async function StylesPage() {
  const styles = await getStyles()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Phối theo style" title="Năm hướng style" />
      <div className="mt-4 space-y-16">
        {styles.map((style) => (
          <article key={style.slug} className="grid gap-6 sm:grid-cols-5 sm:items-center">
            <div className="sm:col-span-2">
              <EditorialImage src={style.image} alt={style.name} ratio="look" />
            </div>
            <div className="sm:col-span-3">
              <h3 className="font-display text-3xl">{style.name}</h3>
              <p className="mt-3 max-w-md font-body text-base text-accent-soft">{style.tagline}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
