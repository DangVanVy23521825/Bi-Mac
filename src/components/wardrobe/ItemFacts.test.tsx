import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { allColors, allItems, allStyles } from '@/data'
import { ItemFacts } from './ItemFacts'

describe('ItemFacts', () => {
  const item = allItems.find((candidate) => candidate.slug === 'so-mi-trang')
  if (!item) {
    throw new Error('fixture item không tồn tại')
  }

  const styles = item.styleSlugs
    .map((slug) => allStyles.find((style) => style.slug === slug))
    .filter((style): style is NonNullable<typeof style> => style !== undefined)

  const colors = item.colorSlugs
    .map((slug) => allColors.find((color) => color.slug === slug))
    .filter((color): color is NonNullable<typeof color> => color !== undefined)

  it('style và màu là link sang trang thật', () => {
    render(<ItemFacts item={item} styles={styles} colors={colors} />)
    expect(screen.getByRole('link', { name: /Modern Classic/ })).toHaveAttribute(
      'href', '/styles/modern-classic',
    )
  })

  it('dịp mặc hiện nhãn tiếng Việt, không hiện slug', () => {
    render(<ItemFacts item={item} styles={styles} colors={colors} />)
    expect(screen.getByText('Đi làm')).toBeInTheDocument()
    expect(screen.queryByText('work')).not.toBeInTheDocument()
  })
})
