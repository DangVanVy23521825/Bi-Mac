export type CategorySlug = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'

export type Color = { slug: string; name: string; hex: string }

export type Occasion = 'work' | 'school' | 'casual' | 'date' | 'event'
export type Fit = 'fitted' | 'relaxed' | 'oversized'
export type ItemAttribute =
  | 'sleeveless' | 'sheer' | 'clingy' | 'structured-shoulder'
  | 'cropped' | 'high-heel' | 'short-hem' | 'bright-color'

export type Category = { slug: CategorySlug; name: string; intro: string }

export type FashionItem = {
  slug: string
  name: string
  category: CategorySlug
  excerpt: string
  image: string | null
  colorSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
  fit: Fit | null
  attributes: ItemAttribute[]
  whatItIs: string
  characteristics: string[]
  howToStyle: string
  whatToAvoid: string
}

export type Style = {
  slug: string
  name: string
  tagline: string
  image: string | null
  colorSlugs: string[]
  paragraphs: string[]
  outfitFormulas: string[]
}

export type Outfit = {
  slug: string
  name: string
  whyItWorks: string
  image: string | null
  itemSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
}

export type Story = {
  slug: string
  title: string
  excerpt: string
  image: string | null
}
