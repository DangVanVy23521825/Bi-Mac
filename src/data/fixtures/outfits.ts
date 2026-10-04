import type { Outfit } from '@/types/content'

export const outfits: Outfit[] = [
  {
    slug: 'modern-classic-di-lam',
    name: 'Modern Classic đi làm',
    whyItWorks:
      'Sơ mi trắng giữ phần trên gọn, ống quần rộng cân lại tỷ lệ, và cả bộ chỉ dùng ba màu nên không có chi tiết nào phải giành chú ý.',
    image: null,
    itemSlugs: ['so-mi-trang', 'quan-wide-leg-chocolate', 'loafer'],
    styleSlugs: ['modern-classic'],
  },
  {
    slug: 'soft-feminine-cuoi-tuan',
    name: 'Soft Feminine cuối tuần',
    whyItWorks:
      'Áo lụa rủ xuống gặp chân váy midi tạo một đường dọc liền mạch; sắc burgundy ấm giữ outfit khỏi nhạt.',
    image: null,
    itemSlugs: ['ao-lua', 'chan-vay-midi', 'loafer'],
    styleSlugs: ['soft-feminine'],
  },
]
