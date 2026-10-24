import type { FashionItem } from '@/types/content'

export const items: FashionItem[] = [
  {
    slug: 'ao-cardigan',
    name: 'Cardigan len',
    category: 'outerwear',
    excerpt:
      'Lớp khoác mềm, không cấu trúc — làm outfit ấm và dịu lại mà không thêm đường vai hay nếp gấp nào.',
    image: '/images/items/ao-cardigan.jpg',
    colorSlugs: ['burgundy'],
    styleSlugs: ['quiet-luxury', 'soft-feminine'],
    occasions: ['casual', 'school', 'work'],
    fit: 'relaxed',
    attributes: [],
    whatItIs:
      'Cardigan len là lớp khoác mềm, dệt kim, không có cấu trúc vai hay lớp lót trong như blazer. Nó mở ở giữa, thường cài cúc hoặc để buông, và co giãn theo cử động nên tạo cảm giác ấm mà không tăng khối lượng thị giác cho outfit, khác hẳn độ cứng và nặng vai của một chiếc blazer.',
    characteristics: [
      'Dệt kim len, co giãn nhẹ, không giữ nếp gấp như vải dệt thoi.',
      'Không có đường vai cấu trúc, rủ theo vai một cách tự nhiên.',
      'Độ dài thường qua hông, hợp để mặc hở hoặc cài vài cúc giữa.',
      'Màu burgundy trong catalog ấm, dễ làm điểm nhấn cho nền trung tính.',
    ],
    howToStyle:
      'Mặc hở cardigan ngoài sơ mi trắng hoặc áo lụa để thêm lớp mà không thêm cấu trúc — hợp cho ngày làm việc không cần quá nghiêm túc. Cuối tuần, phối với quần wide-leg chocolate, để cardigan buông tự nhiên, không cài cúc. Đi học, thêm loafer để cả bộ gọn mà vẫn dễ di chuyển. Với chân váy midi, cardigan thay được vai trò của blazer khi muốn outfit mềm hơn mà vẫn đủ lớp để không đơn điệu.',
    whatToAvoid:
      'Tránh cài hết cúc cardigan khi phối với quần ống rộng — toàn bộ outfit sẽ ngả hẳn về phía mềm, mất điểm tựa cấu trúc. Tránh chọn cardigan quá dài qua chân váy midi, hai lớp dài sẽ che mất đường cạp của chân váy. Tránh phối cardigan burgundy với áo cũng tông ấm đậm bên trong — cần ít nhất một món màu kem hoặc be-xám để ngắt tông.',
  },
  {
    slug: 'so-mi-trang',
    name: 'Sơ mi trắng',
    category: 'tops',
    excerpt: 'Món nền của gần như mọi outfit chỉn chu. Khác biệt nằm ở dáng cổ và độ đứng của vải.',
    image: null,
    colorSlugs: ['kem'],
    styleSlugs: ['modern-classic', 'minimalist', 'quiet-luxury'],
    occasions: ['work', 'school', 'event', 'casual'],
    fit: 'fitted',
    attributes: [],
    whatItIs:
      'Sơ mi trắng là món nền có cấu trúc: cổ đứng hoặc cổ bẻ, nẹp cúc chính giữa, và vải đủ dày để giữ dáng khi tay áo gấp lên. Khác với áo phông, sơ mi có đường may ở vai và eo tạo khối rõ, nên nó làm phần trên của outfit gọn lại ngay cả khi phần dưới rộng.',
    characteristics: [
      'Cổ đứng hoặc cổ bẻ vừa, giữ form dù không là ủi mỗi lần mặc.',
      'Vải cotton hoặc poplin đủ dày để không cần lớp định hình bên trong.',
      'Đường eo chiết nhẹ, không ôm sát nhưng vẫn thấy rõ eo khi bỏ vào quần.',
      'Tay áo đủ dài để xắn gọn ba lần, không bị thừa vải khi gấp.',
    ],
    howToStyle:
      'Bỏ sơ mi vào quần âu hoặc chân váy midi là cách nhanh nhất để outfit trông chỉn chu cho đi làm. Với quần wide-leg chocolate, nên bỏ áo vào trong vì cạp cao của quần đã chia tỷ lệ cơ thể — bỏ ngoài sẽ làm outfit mất đường eo. Khi cần nghiêm túc hơn, khoác thêm blazer ngoài sơ mi. Cuối tuần, xắn tay, để sơ mi ngoài quần, bỏ hết chi tiết đi làm.',
    whatToAvoid:
      'Tránh ủi sơ mi quá phẳng rồi mặc với chân váy midi nhăn — độ đứng khác nhau giữa hai món sẽ làm outfit trông lệch chất liệu. Tránh đóng hết cúc cổ khi không đi làm, trông gượng. Tránh phối sơ mi trắng với một món khác cũng nhiều chi tiết ở phần trên — sơ mi nên là món yên tĩnh nhất trong outfit.',
  },
  {
    slug: 'ao-lua',
    name: 'Áo lụa',
    category: 'tops',
    excerpt: 'Độ rủ và ánh sáng trên bề mặt làm outfit mềm lại mà không cần thêm chi tiết nào.',
    image: null,
    colorSlugs: ['kem', 'burgundy'],
    styleSlugs: ['soft-feminine', 'quiet-luxury'],
    occasions: ['work', 'date', 'event', 'casual'],
    fit: 'relaxed',
    attributes: ['sheer'],
    whatItIs:
      'Áo lụa là lớp vải mỏng, có độ rủ tự nhiên và ánh sáng nhẹ trên bề mặt, khác hẳn độ cứng của cotton. Lụa không giữ nếp gấp nên rơi theo đường cơ thể thay vì tạo khối, và vì mỏng nên gần như luôn cần tính đến lớp trong hoặc lớp ngoài đi kèm.',
    characteristics: [
      'Độ rủ mềm, không giữ nếp gấp khi cử động hoặc ngồi lâu.',
      'Bề mặt có ánh nhẹ, bắt sáng khác với vải dệt thô như cotton.',
      'Dáng relaxed qua thân, không chiết eo nên cần món khác tạo điểm nhấn tỷ lệ.',
      'Chất mỏng, gần như luôn hơi xuyên sáng dưới đèn mạnh hoặc ngoài trời.',
    ],
    howToStyle:
      'Vì áo lụa thiên về relaxed, nên phối với một món có cấu trúc để outfit không mềm toàn bộ — quần âu hoặc chân váy midi là lựa chọn an toàn. Đi làm, bỏ áo lụa vào quần âu và khoác blazer ngoài để bù lại độ mỏng. Buổi tối hoặc hẹn hò, để áo lụa buông ngoài quần âu, thêm túi có kết cấu để outfit không trôi hoàn toàn về phía mềm mại.',
    whatToAvoid:
      'Tránh phối áo lụa với một món cũng rủ mềm như chân váy midi vải mỏng — cả outfit sẽ mất điểm tựa và trông nhão. Vì áo có thể hơi xuyên sáng, tránh mặc một lớp duy nhất dưới đèn mạnh hoặc ánh nắng gắt mà không tính lớp trong. Tránh ủi áo lụa ở nhiệt cao, vải cháy bề mặt rất nhanh.',
  },
  {
    slug: 'quan-wide-leg-chocolate',
    name: 'Quần wide-leg chocolate',
    category: 'bottoms',
    excerpt: 'Ống rộng kéo dáng và màu chocolate ấm hơn đen — dễ mặc hơn vẻ ngoài của nó.',
    image: null,
    colorSlugs: ['chocolate'],
    styleSlugs: ['modern-classic', 'casual-chic'],
    occasions: ['work', 'casual', 'event'],
    fit: 'relaxed',
    attributes: [],
    whatItIs:
      'Quần wide-leg chocolate là quần ống rộng từ hông xuống gót, cạp cao, màu nâu chocolate ấm thay vì đen tuyền. Ống rộng đều từ đùi xuống ống, không bó ở gối, nên khi đứng yên quần tạo một đường thẳng dọc từ eo xuống sàn, khác với dáng côn dần của quần âu.',
    characteristics: [
      'Cạp cao, thường có pleat nhẹ ở trước giúp quần đứng dáng khi bước.',
      'Ống rộng đều, không bó gối, tạo đường thẳng dọc thân dưới.',
      'Màu chocolate ấm hơn đen, dễ phối với kem và be-xám hơn phối lạnh.',
      'Vải đủ nặng để ống không bay khi đi, giữ được form suốt ngày.',
    ],
    howToStyle:
      'Vì cạp cao đã chia tỷ lệ cơ thể, nên bỏ áo vào trong — sơ mi trắng hoặc áo dệt kim mỏng đều hợp. Đi làm, phối với blazer và loafer để cả bộ gọn mà không cứng. Cuối tuần, đổi blazer thành cardigan len, giữ áo dệt kim mỏng bên trong để outfit nhẹ hơn mà không mất cấu trúc của quần. Buổi tối, thêm túi có kết cấu để nâng outfit lên mà không cần đổi quần.',
    whatToAvoid:
      'Tránh mặc quần ống rộng với áo cũng rộng và dài qua hông — hai lớp rộng chồng lên nhau sẽ nuốt mất đường cạp cao, vốn là điểm neo tỷ lệ của quần này. Tránh để ống quần dài lê xuống sàn khi đi giày đế mỏng như ballet flat. Tránh phối với giày cao gót mảnh — đế cần đủ rõ để đỡ phần ống rộng phía trên.',
  },
  {
    slug: 'chan-vay-midi',
    name: 'Chân váy midi',
    category: 'bottoms',
    excerpt: 'Độ dài qua bắp chân là chỗ cân bằng giữa thoải mái và trang trọng.',
    image: null,
    colorSlugs: ['be-xam', 'den'],
    styleSlugs: ['soft-feminine', 'modern-classic'],
    occasions: ['work', 'casual', 'date', 'event'],
    fit: 'relaxed',
    attributes: [],
    whatItIs:
      'Chân váy midi dài qua bắp chân, thường đến giữa ống chân hoặc thấp hơn một chút. Độ dài này che đủ để trang trọng nhưng ngắn hơn maxi nên vẫn đi lại thoải mái — đó là lý do nó xuất hiện được ở cả outfit đi làm và outfit cuối tuần.',
    characteristics: [
      'Dài qua bắp chân, thường xòe nhẹ hoặc suông thẳng tùy vải.',
      'Cạp cao hoặc cạp vừa, ít khi có pleat sâu như quần âu.',
      'Vải đủ đứng để không bết vào chân khi đi bộ nhiều.',
      'Màu trong catalog gồm be-xám và đen, dễ làm nền cho áo nhiều màu.',
    ],
    howToStyle:
      'Áo lụa bỏ vào trong chân váy midi tạo một đường dọc liền mạch, hợp cho hẹn hò hoặc sự kiện buổi tối. Đi làm, đổi áo lụa thành sơ mi trắng và thêm blazer để cả bộ nghiêm túc hơn. Cuối tuần, phối với cardigan len và loafer, bỏ hết lớp khoác cứng. Vì chân váy đã có độ trang trọng riêng, không cần thêm túi có kết cấu để outfit vẫn đủ hoàn chỉnh.',
    whatToAvoid:
      'Tránh phối chân váy midi với áo cũng dài qua hông — hai lớp dài chồng lên che mất đường cạp, làm outfit trông như một khối vải. Tránh đi giày đế quá bệt với chân váy xòe rộng, outfit sẽ thiếu điểm neo ở chân. Tránh chọn áo cùng tông quá sát màu chân váy khi cùng be-xám — outfit cần ít nhất một điểm tương phản nhẹ.',
  },
  {
    slug: 'blazer',
    name: 'Blazer',
    category: 'outerwear',
    excerpt: 'Thêm cấu trúc cho vai và biến một outfit thường ngày thành outfit đi làm.',
    image: null,
    colorSlugs: ['den', 'chocolate'],
    styleSlugs: ['modern-classic', 'minimalist'],
    occasions: ['work', 'event'],
    fit: 'fitted',
    attributes: ['structured-shoulder'],
    whatItIs:
      'Blazer là lớp khoác có cấu trúc rõ ở vai và ngực, thường có lớp lót trong và cúc cài trước. Đường vai structured-shoulder là đặc điểm nhận diện — nó mở khung vai một chút và kéo thẳng đường từ vai xuống eo, khác hẳn độ mềm của cardigan hay trench coat.',
    characteristics: [
      'Vai có đệm nhẹ (structured-shoulder), tạo đường ngang rõ trên khung người.',
      'Form fitted qua ngực và eo, không rộng như áo khoác casual.',
      'Cúc cài trước, thường một hoặc hai hàng, giữ phom khi đóng kín.',
      'Vải có độ đứng cao hơn áo thường, ít nhăn khi ngồi lâu.',
    ],
    howToStyle:
      'Khoác blazer ngoài sơ mi trắng hoặc shirt dress là công thức đi làm nhanh nhất — hai món đều có cấu trúc riêng nên không cần thêm chi tiết khác. Vì vai đã có đường cấu trúc sẵn, nên tránh đeo túi quai yếm to ngang vai; túi có kết cấu dạng cầm tay hợp hơn. Sự kiện buổi tối, mặc blazer không cài cúc, để hở áo lụa bên trong.',
    whatToAvoid:
      'Tránh mặc blazer cùng lúc với một món cũng có đường vai rộng như trench coat — hai lớp cấu trúc chồng nhau sẽ làm outfit trông cứng và nặng vai. Tránh cài hết cúc khi ngồi lâu, vải sẽ nhăn ở eo. Tránh chọn blazer rộng hơn một cỡ để "thoải mái" — cấu trúc vai chỉ hoạt động đúng khi đúng form.',
  },
  {
    slug: 'loafer',
    name: 'Loafer',
    category: 'accessories',
    excerpt: 'Phẳng, kín mũi, đứng dáng — đôi giày làm outfit nghiêm túc hơn mà vẫn đi bộ được.',
    image: null,
    colorSlugs: ['chocolate', 'den'],
    styleSlugs: ['modern-classic', 'casual-chic', 'quiet-luxury'],
    occasions: ['work', 'school', 'casual', 'event'],
    fit: null,
    attributes: [],
    whatItIs:
      'Loafer là giày kín mũi, không dây, đế thấp nhưng đứng dáng hơn ballet flat nhờ phần đế dày hơn một chút. Dáng giày vuông hoặc gần vuông ở mũi, khác với mũi nhọn của giày tây, nên trông nghiêm túc mà vẫn đi bộ được cả ngày, không cần đổi giày giữa buổi.',
    characteristics: [
      'Kín mũi, không dây, đế thấp nhưng có độ dày hơn ballet flat.',
      'Mũi vuông hoặc gần vuông, khác dáng mũi nhọn của giày tây cổ điển.',
      'Thường có chi tiết khóa hoặc đường may ở mu bàn chân.',
      'Màu chocolate và đen trong catalog đều trung tính, hợp nhiều outfit.',
    ],
    howToStyle:
      'Loafer hợp với hầu hết outfit đi làm trong catalog — sơ mi trắng và quần wide-leg chocolate, hoặc sơ mi với chân váy midi và blazer. Vì đế thấp và đứng dáng, loafer cũng hợp đi học hoặc cuối tuần khi cần đi lại nhiều mà vẫn muốn gọn hơn giày thể thao. Với shirt dress, loafer giữ outfit nghiêng về hướng gọn gàng hơn là mềm mại.',
    whatToAvoid:
      'Tránh phối loafer với outfit đã mềm mại như áo lụa và chân váy midi xòe rộng cho buổi hẹn hò — loafer kín mũi kéo tổng thể về hướng nghiêm túc hơn ý định ban đầu; ballet flat hợp hơn lúc đó. Tránh đi loafer không tất lâu giờ. Tránh chọn loafer quá rộng — giày lỏng ở gót làm mất sự đứng đắn vốn có của kiểu giày này.',
  },
]
