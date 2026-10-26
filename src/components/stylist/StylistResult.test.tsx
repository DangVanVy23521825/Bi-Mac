import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StylistOutcome } from '@/features/stylist/pipeline'
import { StylistResult } from './StylistResult'

const outcome: StylistOutcome = {
  goal: 'outfits',
  providerId: 'gemini',
  degraded: false,
  degradedReason: null,
  styleDirections: [
    {
      slug: 'minimalist',
      name: 'Minimalist',
      affinity: 0.82,
      reason: 'Bạn chọn những món ít chi tiết và ưu tiên sự gọn gàng.',
      href: '/styles/minimalist',
    },
  ],
  palette: [
    { slug: 'kem', name: 'Kem', hex: '#F5F0E8', reason: 'Màu nền trung tính, dễ phối.' },
  ],
  outfits: [
    {
      slug: 'modern-classic-di-lam',
      name: 'Modern Classic đi làm',
      image: null,
      whyThisWorks:
        'Sơ mi trắng giữ phần trên gọn, ống quần rộng cân lại tỷ lệ, cả bộ chỉ dùng ba màu.',
      items: [
        { slug: 'so-mi-trang', name: 'Sơ mi trắng', href: '/wardrobe/tops/so-mi-trang' },
        { slug: 'quan-wide-leg-chocolate', name: 'Quần wide-leg chocolate', href: '/wardrobe/bottoms/quan-wide-leg-chocolate' },
      ],
    },
  ],
  items: [
    {
      slug: 'blazer',
      name: 'Blazer',
      excerpt: 'Thêm cấu trúc cho vai và biến một outfit thường ngày thành outfit đi làm.',
      image: null,
      href: '/wardrobe/outerwear/blazer',
    },
  ],
  notes: [],
}

describe('StylistResult', () => {
  it('mỗi gợi ý là link sang entity thật', () => {
    render(<StylistResult outcome={outcome} />)
    expect(screen.getByRole('link', { name: /Minimalist/ })).toHaveAttribute(
      'href', '/styles/minimalist',
    )
    expect(screen.getByRole('link', { name: /Sơ mi trắng/ })).toHaveAttribute(
      'href', '/wardrobe/tops/so-mi-trang',
    )
  })

  it('nói rõ đang ở chế độ dự phòng khi degraded', () => {
    render(<StylistResult outcome={{ ...outcome, degraded: true, degradedReason: 'timeout' }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/dự phòng/i)
  })

  it('không hiện affinity dạng phần trăm', () => {
    render(<StylistResult outcome={outcome} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('outfit rỗng thì ra empty state có đường đi tiếp', () => {
    render(<StylistResult outcome={{ ...outcome, outfits: [], notes: ['Ràng buộc tránh hơi hẹp.'] }} />)
    expect(screen.getByText(/Ràng buộc tránh hơi hẹp/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khám phá theo style/ })).toHaveAttribute(
      'href', '/styles',
    )
  })

  it('analysis rỗng hoàn toàn vẫn không ra màn hình trắng', () => {
    render(<StylistResult outcome={{
      ...outcome, styleDirections: [], palette: [], outfits: [], items: [],
      notes: ['Chưa đủ dữ kiện để chốt một hướng.'],
    }} />)
    expect(screen.getByText(/Chưa đủ dữ kiện/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khám phá theo style/ })).toBeInTheDocument()
  })

  // Trước fix, StylistResult không render một tấm ảnh nào — kết quả của một
  // sản phẩm thời trang là một khối chữ thuần, dù `StylistOutcome` đã mang
  // sẵn `image` cho cả outfit lẫn món đồ (xem pipeline.ts). Hai test dưới
  // khoá việc ảnh thật lên màn hình, và việc thiếu ảnh vẫn giữ đúng chỗ
  // thay vì làm nhảy bố cục.
  it('render ảnh của outfit và của món đồ khi catalog có ảnh', () => {
    render(
      <StylistResult
        outcome={{
          ...outcome,
          outfits: [{ ...outcome.outfits[0]!, image: '/images/outfits/modern-classic-di-lam.jpg' }],
          items: [{ ...outcome.items[0]!, image: '/images/items/blazer.jpg' }],
        }}
      />,
    )
    expect(screen.getByAltText('Modern Classic đi làm')).toBeInTheDocument()
    expect(screen.getByAltText('Blazer')).toBeInTheDocument()
  })

  it('outfit/món chưa có ảnh vẫn giữ chỗ ảnh thay vì bỏ trống', () => {
    const { container } = render(<StylistResult outcome={outcome} />)
    expect(container.querySelectorAll('[data-placeholder="true"]').length).toBeGreaterThanOrEqual(2)
  })
})
