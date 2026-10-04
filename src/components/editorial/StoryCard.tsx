import { EditorialImage } from '@/components/ui/EditorialImage'
import type { Story } from '@/types/content'

export function StoryCard({ story }: { story: Story }) {
  return (
    <article>
      <EditorialImage src={story.image} alt={story.title} ratio="portrait" />
      <h3 className="mt-4 font-display text-xl leading-snug">{story.title}</h3>
      <p className="mt-2 font-body text-sm text-accent-soft">{story.excerpt}</p>
    </article>
  )
}
