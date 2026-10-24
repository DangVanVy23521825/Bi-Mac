import type { Style } from '@/types/content'

export const styles: Style[] = [
  {
    slug: 'modern-classic',
    name: 'Modern Classic',
    tagline: 'Đường cắt gọn, màu tiết chế, mặc được mười năm không cũ.',
    image: null,
    colorSlugs: ['kem', 'chocolate', 'den'],
    paragraphs: [
      'Modern Classic không phải là "đơn giản" theo nghĩa thiếu chi tiết — nó là có chọn lọc. Một outfit modern classic thường chỉ dùng hai hoặc ba màu, nhưng mỗi món đều có cấu trúc rõ: sơ mi trắng có đường nẹp cúc đứng, quần wide-leg chocolate có cạp cao kéo tỷ lệ, blazer có vai dựng. Sự rõ ràng ở từng món, cộng với số màu hạn chế, là lý do phong cách này không lỗi thời — nó không dựa vào chi tiết thời thượng nào để gây ấn tượng, nên không có gì để lỗi mốt.',
      'Vì mỗi món đã đủ cấu trúc riêng, modern classic kỵ việc chồng thêm lớp mang tính trang trí — khăn, túi nhiều khóa, giày có điểm nhấn. Loafer kín mũi và túi gọn là lựa chọn đúng tinh thần: chúng hoàn thiện outfit mà không thêm điểm nhìn mới. Đây cũng là phong cách dễ chuyển từ môi trường công việc sang sự kiện buổi tối nhất trong catalog, vì khoảng cách giữa "đi làm" và "trang trọng" chỉ là thêm blazer hoặc đổi sơ mi trắng thành chân váy midi.',
      'Trong catalog, modern classic xuất hiện nhiều nhất ở dịp đi làm và sự kiện — hai dịp mà sự rõ ràng của đường cắt quan trọng hơn độ thoải mái. Outfit "Modern Classic đi làm" là ví dụ gọn nhất: ba món, ba màu, không món nào thừa. Khi cần nâng mức trang trọng, thêm chân váy midi và blazer thay cho quần wide-leg chocolate là cách đổi nhanh nhất mà không phải nghĩ lại cả bộ từ đầu.',
    ],
    outfitFormulas: [
      'Sơ mi trắng + quần wide-leg chocolate + loafer',
      'Sơ mi trắng + chân váy midi + blazer + loafer',
      'Blazer + quần wide-leg chocolate + loafer',
    ],
  },
  {
    slug: 'quiet-luxury',
    name: 'Quiet Luxury',
    tagline: 'Không logo, không ồn ào. Chất liệu và dáng áo nói thay.',
    image: '/images/styles/quiet-luxury.jpg',
    colorSlugs: ['kem', 'be-xam', 'chocolate'],
    paragraphs: [
      'Quiet Luxury đặt cược vào chất liệu thay vì logo hay chi tiết nổi bật. Trong catalog, điều này thể hiện rõ nhất ở cách áo lụa và cardigan len được phối cùng nhau — cả hai đều không có đường cắt phô trương, nhưng độ rủ của lụa và độ mềm của len dệt kim là thứ chỉ nhận ra khi nhìn gần. Phong cách này không cố gây chú ý từ xa; nó được thiết kế để đứng vững khi nhìn kỹ.',
      'Bảng màu quiet luxury trong catalog là kem, be-xám, chocolate — ba tông nằm gần nhau trên vòng màu, nên khi phối cùng nhau luôn tạo cảm giác lớp lang chứ không tương phản. Cardigan len burgundy đi với quần wide-leg chocolate là ví dụ: hai sắc ấm đủ khác để thấy chiều sâu, chưa đủ xa để thành điểm nhấn. Đây là lý do quiet luxury thường bị nhầm là "đơn sắc" trong khi thực ra có nhiều lớp màu hơn modern classic.',
      'Vì không dựa vào logo hay chi tiết nổi bật, quiet luxury đòi hỏi người mặc tin vào món đồ mình chọn hơn các phong cách khác — không có gì để chỉ ra "đây là món đắt" ngoài cách vải rơi và cách màu ăn nhau. Đó cũng là lý do phong cách này hợp với những dịp cần sự chắc chắn mà không cần phô diễn, như buổi tối quan trọng hoặc ngày làm việc cần gây ấn tượng bằng sự điềm tĩnh hơn là nổi bật.',
    ],
    outfitFormulas: [
      'Cardigan len + quần wide-leg chocolate + loafer',
      'Áo lụa + chân váy midi + loafer',
      'Sơ mi trắng + cardigan len + loafer',
    ],
  },
  {
    slug: 'minimalist',
    name: 'Minimalist',
    tagline: 'Ít chi tiết nhất có thể, nhưng mỗi chi tiết đều đúng chỗ.',
    image: null,
    colorSlugs: ['kem', 'den', 'be-xam'],
    paragraphs: [
      'Minimalist trong catalog không đồng nghĩa với màu đơn sắc tuyệt đối — kem, đen, be-xám vẫn là ba màu, không phải một. Thứ bị loại bỏ là chi tiết thừa: không túi áo trang trí, không đường diễu chỉ màu, không khóa kéo hở. Sơ mi trắng và blazer là hai món đại diện rõ nhất, vì cả hai đạt cảm giác "nghiêm túc" chỉ bằng đường cắt, không cần thêm họa tiết hay phụ kiện đi kèm.',
      'Vì không có chi tiết để che lỗi, minimalist là phong cách khó mặc nhất trong catalog nếu món đồ không đúng form — một chiếc blazer rộng hơn cỡ sẽ lộ ngay vì không có gì khác để đánh lạc hướng. Đổi lại, khi đúng form, outfit minimalist gọn và nhẹ hơn mọi phong cách khác, vì số món trong một bộ thường chỉ hai hoặc ba.',
      'Minimalist và quiet luxury là hai phong cách dễ nhầm nhất trong năm, vì chia sẻ hai trên ba màu trong bảng — cả hai đều có kem và be-xám. Khác biệt nằm ở màu còn lại và ở chất liệu đứng trên đó: minimalist chọn đen làm nền lạnh, đứng trên sơ mi trắng và blazer có cấu trúc rõ; quiet luxury chọn chocolate làm nền ấm, đứng trên áo lụa và cardigan len có độ rủ mềm. Đặt hai outfit cạnh nhau, khoảng cách không nằm ở màu mà ở cách vải phản ứng với ánh sáng — một bên cứng và rõ nét, một bên mềm và lặng.',
    ],
    outfitFormulas: [
      'Sơ mi trắng + quần wide-leg chocolate + loafer',
      'Blazer + chân váy midi + loafer',
      'Sơ mi trắng + blazer + loafer',
    ],
  },
  {
    slug: 'soft-feminine',
    name: 'Soft Feminine',
    tagline: 'Mềm mà không ngọt. Dáng rủ, màu ấm, đường viền nhẹ.',
    image: null,
    colorSlugs: ['kem', 'burgundy', 'be-xam'],
    paragraphs: [
      'Soft Feminine dựa vào độ rủ của vải nhiều hơn màu sắc để tạo cảm giác mềm — áo lụa và chân váy midi trong catalog đều là vải rơi theo đường cơ thể, không giữ nếp gấp như vải dệt thoi cứng. Đây là điểm phân biệt với "ngọt": phong cách này mềm vì chất liệu, không phải vì màu pastel hay chi tiết bèo nhún.',
      'Cardigan len xuất hiện trong soft feminine như một lớp cân bằng — nó mềm nhưng không rủ như lụa, nên khi khoác ngoài áo lụa và chân váy midi, outfit không trôi hoàn toàn về phía lỏng lẻo. Burgundy là màu neo của phong cách này: đủ ấm để không lạnh lùng, đủ đậm để không yếu đi cạnh những món vải mỏng.',
      'Vì dựa vào vải rủ, soft feminine ít xuất hiện trong outfit đi làm nghiêm ngặt của catalog hơn modern classic hay minimalist — chân váy midi và áo lụa hợp hơn với cuối tuần, hẹn hò, hoặc những dịp không cần đường cắt dựng. Khi cần đi làm, thêm blazer là cách duy nhất giữ được tinh thần mềm mại mà vẫn đủ cấu trúc để qua được một ngày họp.',
    ],
    outfitFormulas: [
      'Áo lụa + chân váy midi + loafer',
      'Cardigan len + chân váy midi + loafer',
      'Áo lụa + cardigan len + loafer',
    ],
  },
  {
    slug: 'casual-chic',
    name: 'Casual Chic',
    tagline: 'Thoải mái nhưng vẫn có chủ ý. Thường ngày mà không tạm bợ.',
    image: null,
    colorSlugs: ['kem', 'den', 'chocolate'],
    paragraphs: [
      'Casual Chic khác "mặc tạm" ở một điểm: luôn có ít nhất một món đứng dáng để giữ outfit không bị xô lệch. Quần wide-leg chocolate là món đó — ống rộng nhưng cạp cao và vải đủ nặng để giữ form suốt ngày, nên dù phối với món thoải mái khác, outfit vẫn có một đường thẳng dọc làm điểm neo.',
      'Loafer đóng vai trò tương tự ở chân: kín mũi và đứng dáng hơn giày thể thao, nên dù phối với quần rộng hay cardigan buông, outfit vẫn giữ được một mức hoàn chỉnh. Đây là lý do casual chic trong catalog luôn có đúng một món "nghiêm túc" đi cùng những món thoải mái — không phải ngẫu nhiên mà là công thức lặp lại.',
      'Casual chic trong catalog thường dùng chung món với modern classic — cùng quần wide-leg chocolate, cùng loafer — nhưng khác hẳn ở cách phối: không có blazer, không có lớp khoác cứng nào, và luôn có một món mềm như cardigan len để outfit không trông như đi làm. Đây là phong cách lấp đầy khoảng giữa "quá nghiêm túc" và "không có chủ ý" mà nhiều outfit cuối tuần thường rơi vào mà không nhận ra.',
    ],
    outfitFormulas: [
      'Quần wide-leg chocolate + cardigan len + loafer',
      'Sơ mi trắng + quần wide-leg chocolate + loafer',
      'Áo lụa + quần wide-leg chocolate + loafer',
    ],
  },
]
