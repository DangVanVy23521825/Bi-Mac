export type CategorySlug = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'

export type Color = { slug: string; name: string; hex: string }

export type FashionItem = {
  slug: string
  name: string
  category: CategorySlug
  excerpt: string
  image: string | null
  colorSlugs: string[]
  styleSlugs: string[]
}

export type Style = {
  slug: string
  name: string
  tagline: string
  image: string | null
  colorSlugs: string[]
}

export type Outfit = {
  slug: string
  name: string
  whyItWorks: string
  image: string | null
  itemSlugs: string[]
  styleSlugs: string[]
}

export type Story = {
  slug: string
  title: string
  excerpt: string
  image: string | null
}
