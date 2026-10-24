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
    occasions: ['work'],
  },
  {
    slug: 'soft-feminine-cuoi-tuan',
    name: 'Soft Feminine cuối tuần',
    whyItWorks:
      'Áo lụa rủ xuống gặp chân váy midi tạo một đường dọc liền mạch; sắc burgundy ấm giữ outfit khỏi nhạt.',
    image: null,
    itemSlugs: ['ao-lua', 'chan-vay-midi', 'loafer'],
    styleSlugs: ['soft-feminine'],
    occasions: ['casual', 'date'],
  },
  {
    slug: 'quiet-luxury-ngay-thuong',
    name: 'Quiet Luxury ngày thường',
    whyItWorks:
      'Cardigan len không cấu trúc đi cùng quần âu ống rộng là hai sắc thái mềm của cùng một tông ấm, nên cả bộ không có điểm nào phải giành chú ý. Burgundy và chocolate đứng gần nhau trên vòng màu — đủ khác để thấy lớp lang, chưa đủ xa để thành tương phản.',
    image: '/images/outfits/quiet-luxury-ngay-thuong.jpg',
    itemSlugs: ['ao-cardigan', 'quan-wide-leg-chocolate'],
    styleSlugs: ['quiet-luxury'],
    occasions: ['casual'],
  },
]
