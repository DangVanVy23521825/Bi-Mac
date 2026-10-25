import type { Outfit } from '@/types/content'

export const outfits: Outfit[] = [
  {
    slug: 'modern-classic-di-lam',
    name: 'Modern Classic đi làm',
    whyItWorks:
      'Sơ mi trắng giữ phần trên gọn, ống quần rộng cân lại tỷ lệ, và cả bộ chỉ dùng ba màu nên không có chi tiết nào phải giành chú ý. Túi có kết cấu màu chocolate lặp lại màu quần, thêm một điểm neo cứng mà không kéo thêm màu thứ tư vào set.',
    image: null,
    itemSlugs: ['so-mi-trang', 'quan-wide-leg-chocolate', 'loafer', 'tui-co-ket-cau'],
    styleSlugs: ['modern-classic'],
    occasions: ['work'],
  },
  {
    slug: 'so-mi-chan-vay-thanh-lich',
    name: 'Sơ mi chân váy thanh lịch',
    whyItWorks:
      'Sơ mi trắng bỏ gọn vào chân váy midi giữ đường eo rõ, blazer khoác ngoài thêm vai cấu trúc để nâng outfit từ công sở lên đủ chỉn chu cho sự kiện mà không đổi món nào. Ba màu trung tính — kem, be-xám hoặc đen, chocolate ở loafer — giữ tổng thể yên tĩnh, để cấu trúc vai và đường eo làm điểm nhấn chính.',
    image: null,
    itemSlugs: ['so-mi-trang', 'chan-vay-midi', 'blazer', 'loafer'],
    styleSlugs: ['modern-classic'],
    occasions: ['work', 'event'],
  },
  {
    slug: 'soft-feminine-cuoi-tuan',
    name: 'Soft Feminine cuối tuần',
    whyItWorks:
      'Áo lụa rủ xuống gặp chân váy midi tạo một đường dọc liền mạch; sắc burgundy ấm giữ outfit khỏi nhạt. Cardigan khoác hở bên ngoài thêm một lớp mà không thêm cấu trúc, giữ outfit đúng tinh thần mềm của soft-feminine.',
    image: null,
    itemSlugs: ['ao-lua', 'chan-vay-midi', 'ballet-flat', 'ao-cardigan'],
    styleSlugs: ['soft-feminine'],
    occasions: ['casual', 'date'],
  },
  {
    slug: 'ao-lua-quan-au-buoi-toi',
    name: 'Áo lụa quần âu buổi tối',
    whyItWorks:
      'Áo lụa buông ngoài quần âu giữ đúng tinh thần quiet luxury: một lớp mềm đặt cạnh một lớp có đường ly thẳng để outfit không ngả hẳn về phía nào. Loafer và túi có kết cấu cùng tông chocolate hoặc đen lặp lại màu của quần, nên set chỉ xoay quanh hai, ba sắc ấm tối mà vẫn đủ chỉn chu cho buổi tối hoặc hẹn hò.',
    image: null,
    itemSlugs: ['ao-lua', 'quan-au', 'loafer', 'tui-co-ket-cau'],
    styleSlugs: ['quiet-luxury'],
    occasions: ['event', 'date'],
  },
  {
    slug: 'quiet-luxury-ngay-thuong',
    name: 'Quiet Luxury ngày thường',
    whyItWorks:
      'Cardigan len không cấu trúc đi cùng quần âu ống rộng là hai sắc thái mềm của cùng một tông ấm, nên cả bộ không có điểm nào phải giành chú ý. Burgundy và chocolate đứng gần nhau trên vòng màu — đủ khác để thấy lớp lang, chưa đủ xa để thành tương phản. Loafer chocolate khép lại outfit bằng một điểm chắc ở chân, đủ đứng dáng để giữ outfit khỏi trôi hẳn về phía mềm.',
    image: '/images/outfits/quiet-luxury-ngay-thuong.jpg',
    itemSlugs: ['ao-cardigan', 'quan-wide-leg-chocolate', 'loafer'],
    styleSlugs: ['quiet-luxury'],
    occasions: ['casual'],
  },
  {
    slug: 'minimalist-det-kim-quan-au',
    name: 'Minimalist dệt kim quần âu',
    whyItWorks:
      'Áo dệt kim mỏng ôm nhẹ làm lớp trong gọn dưới blazer, quần âu giữ đường ly thẳng nên cả set không cần thêm chi tiết nào khác ngoài túi có kết cấu để khép lại tỷ lệ. Bốn món, bốn vai trò rõ, không món nào lặp việc của món khác — đúng tinh thần minimalist, và màu kem, be-xám, đen giữ tổng thể yên tĩnh.',
    image: null,
    itemSlugs: ['ao-det-kim-mong', 'quan-au', 'blazer', 'tui-co-ket-cau'],
    styleSlugs: ['minimalist'],
    occasions: ['work'],
  },
  {
    slug: 'casual-chic-trench',
    name: 'Casual Chic khoác trench',
    whyItWorks:
      'Trench coat khoác ngoài áo dệt kim mỏng và quần wide-leg chocolate thêm một lớp có cấu trúc cho một set vốn toàn vải mềm và ống rộng, đủ để chuyển outfit từ ở nhà sang ra ngoài mà không đổi món bên trong. Ballet flat giữ phần chân nhẹ, be-xám của trench và chocolate của quần là hai tông ấm gần nhau, không tạo tương phản mạnh.',
    image: null,
    itemSlugs: ['ao-det-kim-mong', 'quan-wide-leg-chocolate', 'trench-coat', 'ballet-flat'],
    styleSlugs: ['casual-chic'],
    occasions: ['casual', 'school'],
  },
  {
    slug: 'shirt-dress-blazer-di-lam',
    name: 'Shirt dress blazer đi làm',
    whyItWorks:
      'Shirt dress dáng relaxed cần một lớp cấu trúc để đủ chỉn chu cho công sở, và blazer khoác ngoài bù lại đúng phần eo không chiết sâu của váy. Loafer và túi có kết cấu cùng tông chocolate hoặc đen khép lại set bằng hai điểm cứng ở hai đầu cơ thể, đủ gọn cho cả công sở và một sự kiện buổi tối.',
    image: null,
    itemSlugs: ['shirt-dress', 'blazer', 'loafer', 'tui-co-ket-cau'],
    styleSlugs: ['modern-classic'],
    occasions: ['work', 'event'],
  },
  {
    slug: 'slip-dress-trench-buoi-toi',
    name: 'Slip dress trench buổi tối',
    whyItWorks:
      'Slip dress là món ít cấu trúc nhất trong outfit này, nên trench coat khoác buông không cài cúc là lớp ngoài cân lại vừa đủ, không cứng như blazer để không xung đột với đường cắt chéo của váy. Ballet flat giữ outfit nhẹ ở chân, và burgundy hoặc đen của slip dress đứng dưới be-xám hoặc kem của trench vẫn giữ được độ sang cho buổi tối.',
    image: null,
    itemSlugs: ['slip-dress', 'trench-coat', 'ballet-flat'],
    styleSlugs: ['quiet-luxury'],
    occasions: ['date', 'event'],
  },
  {
    slug: 'a-line-dress-cardigan',
    name: 'A-line dress cardigan',
    whyItWorks:
      'A-line dress xòe nhẹ từ eo xuống gấu đã đủ mềm, nên cardigan khoác hở chỉ thêm một lớp ấm mà không thêm cấu trúc nào, giữ outfit đúng hướng soft-feminine. Túi có kết cấu là điểm cứng duy nhất của set, cân lại cả hai món đều rủ mềm, còn ballet flat giữ phần chân nhẹ và dễ di chuyển cho cả ngày đi học hoặc cuối tuần.',
    image: null,
    itemSlugs: ['a-line-dress', 'ao-cardigan', 'ballet-flat', 'tui-co-ket-cau'],
    styleSlugs: ['soft-feminine'],
    occasions: ['casual', 'school'],
  },
]
