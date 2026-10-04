import { ColorSwatch } from '@/components/editorial/ColorSwatch'
import { EditorialHero } from '@/components/editorial/EditorialHero'
import { FashionItemTile } from '@/components/editorial/FashionItemTile'
import { OutfitLook } from '@/components/editorial/OutfitLook'
import { StoryCard } from '@/components/editorial/StoryCard'
import { StylistCta } from '@/components/editorial/StylistCta'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  getColorStory, getEssentialItems, getFeaturedLooks,
  getFeaturedStories, getStyles, getTrendingItems,
} from '@/data'
import Link from 'next/link'

export default async function Home() {
  const [trending, colors, essentials, looks, styles, stories] = await Promise.all([
    getTrendingItems(), getColorStory(), getEssentialItems(),
    getFeaturedLooks(), getStyles(), getFeaturedStories(),
  ])

  return (
    <>
      <EditorialHero />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Trending now" title="Đang được mặc nhiều" />
        <div className="grid gap-10 sm:grid-cols-3">
          {trending.map((item) => <FashionItemTile key={item.slug} item={item} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Color story" title="Bảng màu của mùa" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          {colors.map((color) => <ColorSwatch key={color.slug} color={color} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="The wardrobe" title="Những món làm nền cho tủ đồ" />
        <div className="grid gap-10 sm:grid-cols-4">
          {essentials.map((item) => <FashionItemTile key={item.slug} item={item} />)}
        </div>
        <Link
          href="/wardrobe"
          className="mt-10 inline-block font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
        >
          Xem toàn bộ tủ đồ
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Featured looks" title="Outfit gợi ý" />
        <div className="space-y-16">
          {looks.map((outfit) => <OutfitLook key={outfit.slug} outfit={outfit} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Find your style" title="Hướng style nào giống bạn?" />
        <div className="grid gap-10 sm:grid-cols-5">
          {styles.map((style) => (
            <Link key={style.slug} href="/styles" className="group block">
              <EditorialImage src={style.image} alt={style.name} ratio="look" />
              <h3 className="mt-3 font-display text-lg group-hover:text-accent">{style.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <StylistCta />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Fashion stories" title="Đọc thêm" />
        <div className="grid gap-10 sm:grid-cols-3">
          {stories.map((story) => <StoryCard key={story.slug} story={story} />)}
        </div>
      </section>
    </>
  )
}
