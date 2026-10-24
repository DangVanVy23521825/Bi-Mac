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
  {
    slug: 'ao-det-kim-mong',
    name: 'Áo dệt kim mỏng',
    category: 'tops',
    excerpt:
      'Áo dệt kim mỏng ôm nhẹ theo thân, mịn hơn cotton và mỏng hơn cardigan — lớp nền để xếp lớp mà không dày cộm.',
    image: null,
    colorSlugs: ['kem', 'be-xam'],
    styleSlugs: ['minimalist', 'casual-chic', 'quiet-luxury'],
    occasions: ['casual', 'school', 'work'],
    fit: 'fitted',
    attributes: [],
    whatItIs:
      'Áo dệt kim mỏng là áo sợi dệt kim mảnh, ôm nhẹ theo thân nhưng không bó sát như áo co giãn. Độ đàn hồi của sợi kim thay cho đường chiết eo như sơ mi trắng. So với cardigan len, áo này mỏng và nhẹ hơn, đủ mặc một mình hoặc làm lớp trong.',
    characteristics: [
      'Sợi dệt kim mảnh, co giãn tự nhiên, ôm nhẹ theo thân mà không cần chiết eo.',
      'Mỏng hơn cardigan len, đủ nhẹ để làm lớp trong dưới blazer hoặc trench coat.',
      'Không có đường nẹp cúc hay cổ đứng, chỉ cổ tròn hoặc cổ tim đơn giản.',
      'Màu kem và be-xám trong catalog đều trung tính, dễ làm nền cho lớp ngoài đậm màu.',
    ],
    howToStyle:
      'Vì áo đã ôm nhẹ và trung tính, bỏ vào quần âu và khoác blazer là công thức đi làm gọn nhất — hai món đều có cấu trúc nên bù lại độ mềm của áo dệt kim. Đi học hoặc cuối tuần, mặc cùng quần wide-leg chocolate, không cần lớp khoác, thêm túi có kết cấu để outfit không quá đơn giản. Khi trời lạnh, trench coat khoác ngoài giữ được dáng ôm của áo mà không thêm khối ở vai như blazer.',
    whatToAvoid:
      'Tránh mặc áo dệt kim mỏng một mình với quần âu cho dịp cần trang trọng — thiếu lớp ngoài, outfit sẽ thiếu điểm nhấn cấu trúc. Tránh chọn cỡ quá bó sát, vải dệt kim mỏng dễ lộ hết đường chiết của lớp trong trừ khi đó là chủ ý. Tránh giặt ở nhiệt cao, sợi dệt kim mảnh dễ giãn và mất dáng ôm.',
  },
  {
    slug: 'quan-au',
    name: 'Quần âu',
    category: 'bottoms',
    excerpt:
      'Ống côn nhẹ, cạp vừa, đường ly giữa thẳng tắp — món quần nghiêm túc nhất trong catalog.',
    image: null,
    colorSlugs: ['den', 'chocolate'],
    styleSlugs: ['modern-classic', 'minimalist'],
    occasions: ['work', 'event'],
    fit: 'fitted',
    attributes: [],
    whatItIs:
      'Quần âu là quần tây có đường ly giữa thẳng từ gối xuống gấu, ống côn nhẹ hơn quần wide-leg chocolate. Cạp vừa, vải có độ đứng đủ giữ đường ly suốt ngày. Đây là món quần có cấu trúc rõ nhất trong catalog, khác hẳn độ buông của chân váy midi.',
    characteristics: [
      'Đường ly giữa thẳng từ gối xuống gấu, giữ dáng suốt ngày không cần ủi lại.',
      'Ống côn nhẹ, hẹp hơn quần wide-leg chocolate, lộ rõ hình dáng chân hơn.',
      'Cạp vừa, không cao như wide-leg, nên áo bỏ vào trong cần đủ dài.',
      'Vải có độ đứng cao, ít nhăn khi ngồi lâu trong môi trường công sở.',
    ],
    howToStyle:
      'Bỏ áo dệt kim mỏng hoặc sơ mi trắng vào trong quần âu rồi khoác blazer là công thức đi làm gọn và nghiêm túc nhất trong catalog — ba món đều có cấu trúc nên không cần thêm chi tiết khác. Sự kiện buổi tối, đổi blazer thành áo lụa buông ngoài quần, thêm túi có kết cấu để outfit mềm hơn mà quần vẫn giữ đường nghiêm túc. Trời lạnh, trench coat khoác ngoài không phá dáng ống côn của quần.',
    whatToAvoid:
      'Tránh chọn quần âu rộng hơn một cỡ — đường ly sẽ mất tác dụng và ống trông xệ chứ không côn. Tránh phối với áo cũng nhiều cấu trúc như blazer dày mà không chừa món mềm nào, outfit sẽ cứng toàn bộ. Tránh đi giày đế quá dày, phá mất đường thẳng gọn mà ống côn tạo ra.',
  },
  {
    slug: 'shirt-dress',
    name: 'Shirt dress',
    category: 'dresses',
    excerpt:
      'Váy liền dáng sơ mi, cài cúc từ trên xuống — gọn như đi làm, thoải mái như mặc ở nhà.',
    image: null,
    colorSlugs: ['kem', 'be-xam'],
    styleSlugs: ['modern-classic', 'casual-chic'],
    occasions: ['work', 'casual', 'school'],
    fit: 'relaxed',
    attributes: [],
    whatItIs:
      'Shirt dress là váy liền dáng sơ mi, cài cúc từ cổ xuống gấu, mang cấu trúc cổ đứng và nẹp cúc của sơ mi trắng. Dáng relaxed, không chiết eo sâu, cần thắt lưng rời để định hình tỷ lệ. Vì gộp áo và quần thành một, nó giảm quyết định phối đồ nhưng cũng giảm linh hoạt đổi phong cách trong ngày.',
    characteristics: [
      'Cài cúc từ cổ xuống gấu, mang cấu trúc cổ đứng và nẹp cúc như sơ mi trắng.',
      'Dáng relaxed, không chiết eo sâu, cần thắt lưng rời để lấy lại tỷ lệ.',
      'Độ dài qua đầu gối, đi lại thoải mái hơn midi nhưng vẫn đủ trang trọng.',
      'Màu kem và be-xám giữ sắc trung tính, dễ thêm lớp khoác màu đậm bên ngoài.',
    ],
    howToStyle:
      'Vì shirt dress đã gộp áo và quần, phần phối thêm chỉ còn là lớp khoác và giày. Đi làm, khoác blazer ngoài và đi loafer, thêm túi có kết cấu để trông như một outfit có chủ ý chứ không phải mặc nguyên cây. Cuối tuần, đổi blazer thành cardigan len, đi ballet flat để outfit mềm và thường ngày hơn. Luôn thắt lưng ở eo nếu muốn rõ dáng người hơn kiểu buông thẳng nguyên bản.',
    whatToAvoid:
      'Tránh mặc shirt dress buông thẳng không thắt lưng cho dịp cần chỉn chu — dáng relaxed sẽ trông như mặc sơ mi quá khổ. Tránh phối cùng áo khoác cũng dáng dài qua gối như trench coat, hai lớp dài chồng lên nhau làm mất tỷ lệ. Tránh cài hết cúc lên tận cổ khi đi ngày thường, trông gượng như đồng phục.',
  },
  {
    slug: 'slip-dress',
    name: 'Slip dress',
    category: 'dresses',
    excerpt:
      'Dây mỏng, vải bám nhẹ theo thân, cắt chéo — kiểu váy liền ít vải nhất nhưng khó mặc nhất.',
    image: null,
    colorSlugs: ['burgundy', 'den'],
    styleSlugs: ['quiet-luxury', 'soft-feminine'],
    occasions: ['date', 'event'],
    fit: 'relaxed',
    attributes: ['sleeveless', 'clingy'],
    whatItIs:
      'Slip dress là váy liền không tay, cắt chéo theo đường vải nên bám nhẹ theo thân, khác độ đứng khối của shirt dress. Dây áo mỏng, không có cấu trúc vai hay nẹp cúc, dáng váy phụ thuộc vào cách vải rơi. Đây là món ít cấu trúc nhất trong catalog, đối lập với blazer.',
    characteristics: [
      'Cắt chéo theo đường vải, bám nhẹ theo thân (clingy), không giữ khối như vải dệt thẳng.',
      'Không tay, dây áo mỏng, không có đường may định hình ở vai hay eo.',
      'Không hợp lớp trong dày vì vải mỏng dễ lộ đường viền bên dưới.',
      'Màu burgundy và đen trong catalog đều đậm, giữ được độ sang khi vải bám sát.',
    ],
    howToStyle:
      'Vì slip dress không tay và bám sát, luôn cần một lớp ngoài để cân lại — trench coat khoác buông, không cài cúc, là lựa chọn hợp nhất cho sự kiện buổi tối. Cardigan len cũng được nhưng sẽ kéo outfit về hướng thường ngày hơn là sang trọng. Đi ballet flat nếu cần di chuyển nhiều, hoặc giữ nguyên để không kéo thêm một lớp nổi bật vào outfit đã đủ bám sát. Túi có kết cấu giúp outfit có một điểm cứng để không mềm toàn bộ.',
    whatToAvoid:
      'Tránh mặc slip dress không tính lớp trong khi vải mỏng và bám sát — cần tính lớp lót tùy dịp. Tránh phối với áo khoác cũng có cấu trúc chiết eo rõ như blazer, hai đường chiết sẽ xung đột nhau. Tránh chọn phụ kiện cũng có chi tiết bám sát hoặc bóng, outfit sẽ mất điểm neo thị giác.',
  },
  {
    slug: 'a-line-dress',
    name: 'A-line dress',
    category: 'dresses',
    excerpt:
      'Xòe nhẹ từ eo xuống gấu theo dáng chữ A — mềm hơn shirt dress mà không bám như slip dress.',
    image: null,
    colorSlugs: ['kem', 'burgundy'],
    styleSlugs: ['soft-feminine', 'casual-chic'],
    occasions: ['casual', 'school', 'date'],
    fit: 'relaxed',
    attributes: ['sleeveless'],
    whatItIs:
      'A-line dress là váy liền xòe nhẹ từ eo xuống gấu, tạo hình chữ A, khác hẳn độ bám sát của slip dress. Không tay nhưng vải đứng hơn lụa, không cần tính lớp lót như slip dress. Đường eo chiết nhẹ hoặc cắt ngang, định hình dáng mà không cần thắt lưng rời như shirt dress.',
    characteristics: [
      'Xòe nhẹ từ eo xuống gấu theo hình chữ A, không bám sát như slip dress.',
      'Không tay nhưng vải đứng hơn lụa, không cần tính lớp lót phía trong.',
      'Đường eo chiết nhẹ hoặc cắt ngang, định hình dáng mà không cần thắt lưng rời.',
      'Màu kem và burgundy trong catalog hợp cả dịp thường ngày và hẹn hò nhẹ.',
    ],
    howToStyle:
      'Vì không tay và xòe nhẹ, a-line dress cần một lớp ngoài khi trời lạnh hoặc muốn thêm cấu trúc — cardigan len khoác hở là lựa chọn hợp nhất, giữ được độ mềm chung của outfit. Đi học hoặc cuối tuần, đi ballet flat để cả bộ nhẹ và dễ di chuyển. Hẹn hò, thêm túi có kết cấu để outfit không chỉ dựa vào độ xòe của váy mà có thêm một điểm cứng cân lại.',
    whatToAvoid:
      'Tránh phối a-line dress với áo khoác cũng xòe rộng như trench coat dáng buông — hai lớp xòe chồng lên sẽ làm mất đường eo của váy. Tránh đi giày đế quá bệt khi gấu váy xòe rộng, outfit sẽ thiếu điểm neo ở chân. Tránh chọn phụ kiện quá nhỏ hoặc mảnh, tỷ lệ sẽ lọt thỏm trước phần xòe của váy.',
  },
  {
    slug: 'trench-coat',
    name: 'Trench coat',
    category: 'outerwear',
    excerpt:
      'Áo khoác dáng dài, đai lưng rời, cổ bẻ rộng — lớp ngoài chuyển outfit qua mùa mà không đổi gì bên trong.',
    image: null,
    colorSlugs: ['be-xam', 'kem'],
    styleSlugs: ['modern-classic', 'casual-chic'],
    occasions: ['work', 'casual'],
    fit: 'relaxed',
    attributes: [],
    whatItIs:
      'Trench coat là áo khoác dáng dài qua hông hoặc gối, có đai lưng rời và cổ bẻ rộng, khác hẳn độ fitted và vai dựng của blazer. Thân relaxed, không chiết eo trừ khi thắt đai, độ vừa vặn phụ thuộc vào cách buộc đai. Nó là lớp ngoài cùng, mặc ngoài mọi món khác trong catalog, không đứng chung lớp với cardigan hay blazer.',
    characteristics: [
      'Dáng dài qua hông hoặc gối, có đai lưng rời để tự chiết eo khi cần.',
      'Cổ bẻ rộng, thường có cầu vai và túi hộp, chi tiết đặc trưng của áo mưa cổ điển.',
      'Thân relaxed, không chiết sẵn, độ vừa vặn phụ thuộc vào cách buộc đai.',
      'Màu be-xám và kem trong catalog trung tính, hợp làm lớp ngoài cho hầu hết outfit.',
    ],
    howToStyle:
      'Buộc đai ở eo khi mặc ngoài shirt dress hoặc áo dệt kim mỏng và quần âu để trench coat thêm cấu trúc thay vì chỉ thêm lớp ấm. Đi làm, giữ đai buộc gọn và đi loafer để cả bộ nghiêm túc. Cuối tuần, để trench coat buông không buộc đai, mặc ngoài áo dệt kim mỏng và quần wide-leg chocolate, đi ballet flat cho thoải mái hơn.',
    whatToAvoid:
      'Tránh mặc trench coat cùng blazer hoặc món khác cũng có vai cấu trúc — hai lớp dựng vai sẽ chồng lên nhau rất cứng. Tránh để đai lưng buông lỏng không buộc ở công sở, trông luộm thuộm hơn có chủ ý. Tránh chọn trench coat quá dài so với chân váy hoặc váy liền mặc bên trong, phần thừa làm outfit mất tỷ lệ.',
  },
  {
    slug: 'ballet-flat',
    name: 'Ballet flat',
    category: 'accessories',
    excerpt:
      'Đế bệt, mũi tròn, không quai hoặc quai mỏng — nhẹ và mềm hơn loafer, hợp với outfit nhiều vải rủ.',
    image: null,
    colorSlugs: ['den', 'kem'],
    styleSlugs: ['soft-feminine', 'casual-chic'],
    occasions: ['casual', 'school', 'date', 'work'],
    fit: null,
    attributes: [],
    whatItIs:
      'Ballet flat là giày đế bệt, mũi tròn, phần thân mềm và mỏng hơn loafer rất nhiều vì không có lớp đế dày hay khóa kim loại. Vì mềm và nhẹ, ballet flat uốn theo chân khi đi hơn là giữ dáng cứng như loafer, nên hợp với những outfit đã thiên về mềm mại hơn là nghiêm túc.',
    characteristics: [
      'Đế bệt mỏng, mũi tròn, không có phần đế dày như loafer.',
      'Thân giày mềm, uốn theo chân khi đi, không giữ dáng cứng.',
      'Thường không quai hoặc quai mỏng, không có khóa hay chi tiết kim loại.',
      'Màu đen và kem trong catalog đều trung tính, dễ phối với mọi tông màu khác.',
    ],
    howToStyle:
      'Ballet flat hợp nhất với những outfit đã mềm sẵn trong catalog — áo lụa và chân váy midi, hoặc a-line dress và cardigan len. Vì đế mỏng và không giữ dáng cứng, nó giữ outfit nghiêng hẳn về phía thoải mái, khác với loafer vốn kéo outfit về hướng nghiêm túc hơn. Đi học hoặc hẹn hò ban ngày, ballet flat là lựa chọn nhẹ nhất trong catalog để đi lại cả ngày mà không cần đổi giày.',
    whatToAvoid:
      'Tránh đi ballet flat với outfit đã nhiều lớp cứng như blazer và quần âu cho dịp cần nghiêm túc — đế quá mềm sẽ kéo tổng thể lệch hướng; loafer hợp hơn lúc đó. Tránh đi bộ đường dài liên tục vì đế mỏng không có đệm như loafer. Tránh chọn cỡ rộng hơn chân, giày không quai dễ tuột gót khi đi nhanh.',
  },
  {
    slug: 'tui-co-ket-cau',
    name: 'Túi có kết cấu',
    category: 'accessories',
    excerpt:
      'Dáng cứng, có khung hoặc đường may rõ — điểm neo cấu trúc khi outfit còn lại toàn vải mềm.',
    image: null,
    colorSlugs: ['chocolate', 'den'],
    styleSlugs: ['quiet-luxury', 'modern-classic'],
    occasions: ['work', 'event', 'casual', 'date'],
    fit: null,
    attributes: [],
    whatItIs:
      'Túi có kết cấu là túi khung cứng hoặc đường may rõ, giữ dáng cố định, không xệ theo đồ đựng trong như túi vải mềm. Quai ngắn hoặc vừa, cầm tay hoặc đeo chéo gọn. Nó là điểm neo cấu trúc khi outfit còn lại đều mềm hoặc rủ.',
    characteristics: [
      'Khung cứng hoặc đường may rõ, giữ hình dáng cố định dù đựng gì bên trong.',
      'Quai ngắn hoặc vừa, cầm tay hoặc đeo chéo gọn, không phải quai yếm to bản.',
      'Không xệ hay đổi hình như túi vải mềm, luôn giữ đường viền rõ nét.',
      'Màu chocolate và đen trong catalog đều đậm, làm điểm neo thị giác rõ cho outfit nhạt.',
    ],
    howToStyle:
      'Dùng túi có kết cấu khi outfit còn lại đều mềm — áo lụa và quần âu, hoặc slip dress khoác trench coat — để có một điểm cứng cân lại toàn bộ. Vì vai blazer đã có cấu trúc riêng, chọn túi cầm tay nhỏ thay vì túi đeo chéo to khi phối cùng blazer, tránh chồng hai điểm cấu trúc lên nhau. Đi làm, túi này thay được vai trò điểm nhấn mà không cần thêm trang sức hay chi tiết khác.',
    whatToAvoid:
      'Tránh dùng túi có kết cấu cùng outfit đã nhiều món cứng như blazer và quần âu — hai điểm neo cấu trúc sẽ giành chú ý của nhau. Tránh chọn kích thước quá lớn so với outfit mỏng nhẹ như slip dress, tỷ lệ sẽ lệch. Tránh đeo quai chéo khi đã mặc trench coat có đai lưng, hai đường ngang sẽ cắt ngang người ở hai vị trí khác nhau.',
  },
]
