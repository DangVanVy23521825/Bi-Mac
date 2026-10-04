# Bí Mặc — Bản chỉnh hướng dự án (design spec)

Ngày: 2026-10-03
Trạng thái: chờ duyệt
Thay thế: thứ tự mốc trong `docs/09_MVP_ROADMAP.md`, khối lượng nội dung trong
`docs/08_SEED_CONTENT.md`, yêu cầu auth-để-lưu trong `docs/01_PRD.md`, và vai của
mock provider trong `docs/05_AI_STYLIST_SPEC.md` / `ADR-003`.

---

## 1. Vì sao có bản này

`docs/00`–`docs/12` mô tả đầy đủ *sản phẩm gì* và *xây thế nào*, nhưng được viết với
giả định ngầm rằng Bí Mặc là một sản phẩm đi tới người dùng thật. Mục tiêu thực tế
khác: đây là **portfolio**, và người xem là **khách freelance / đối tác tiềm năng**.

Người xem đó không mở code. Họ mở link trên điện thoại, bấm khoảng hai phút, rồi
quyết định. Ba điều đó làm `docs/09` lệch hướng:

1. Deploy nằm ở mốc cuối (M5) — tới cuối mới biết sản phẩm có chạy trên internet không.
2. AI Stylist nằm sau Supabase + Auth + RLS — phần gây ấn tượng nhất về đích sau phần
   tốn công nhất mà người xem này ít quan tâm nhất.
3. Nội dung không có mốc nào — docs coi ~7.000 từ tiếng Việt và ~35 ảnh như tác dụng phụ
   của việc code, trong khi nó là khoảng 40% khối lượng thật.

Bản spec này giữ nguyên luận điểm sản phẩm trong `docs/00` (knowledge-first,
recommendation traceable, education before commerce) và chỉ sửa phạm vi, thứ tự, và
hai quyết định kỹ thuật.

## 2. Tiêu chí thành công

Thành công **không** đo bằng độ đầy đủ tính năng, mà bằng:

- Có URL live, mở được trên điện thoại ở mạng yếu, không vỡ layout từ 360px.
- Một người lạ tự đi hết đường demo hai phút mà không cần hướng dẫn, không gặp link
  chết, không gặp màn hình lỗi, không bị chặn bởi form đăng nhập.
- Nội dung đọc ra giọng người Việt biên tập, không ra giọng máy dịch.
- Phần AI trả về khuyến nghị **bấm vào được** — mỗi gợi ý dẫn tới một entity thật trong
  catalog, không phải văn tả outfit chung chung.
- Nhìn không giống SaaS dashboard, không giống storefront, không giống template thẻ.

## 3. Phạm vi v1

### Trong phạm vi

Năm mục trên nav đều là trang thật, không có "coming soon":

| Khu vực | Nội dung v1 |
|---|---|
| Home | trang editorial, 8 khối theo `docs/02` |
| Wardrobe | index → category → item detail, 15 item / 5 category, 3 item mỗi category |
| Styles | index → style detail, 5 style |
| AI Stylist | đủ luồng, Gemini thật, grounding tất định |
| My Closet | lưu item/look/style bằng `localStorage`, **không đăng nhập** |
| Stories | 3 bài hoàn chỉnh |
| Outfits | 10 look, **không có route riêng** — render dạng component `OutfitLook` nhúng trong trang item và style. `docs/02` để mở chuyện này ("if required by UX"); v1 không cần, và bớt được 8 trang mỏng |

### Ngoài phạm vi v1

- Supabase Postgres, Auth, RLS, Storage — ở lại dạng seam có tài liệu, không bật.
- Tài khoản người dùng, lịch sử AI theo người dùng.
- Ecommerce dưới mọi hình thức (`ADR-001`, ngoài phạm vi vĩnh viễn).
- CMS / admin (`docs/09` M4).
- Catalog quy mô `docs/08` (30-40 item): hoãn, xem §5.

## 4. AI Stylist

### Nguyên tắc chia việc

LLM làm phần nó giỏi — **phán đoán và ngôn ngữ**. Code làm phần bắt buộc phải đúng —
**grounding**. LLM không bao giờ tự bịa outfit.

```text
questionnaire (+ ảnh tùy chọn)
   │  Zod StylistInput
   ▼
StylistProvider.analyze()          Gemini, multimodal, generateObject
   │  Zod StylistAnalysis
   ▼
resolveAnalysis()                  code tất định: slug → entity thật,
   │                               slug không tồn tại bị loại bỏ
   ▼
rankCatalog()                      code tất định: chọn outfit/item khớp
   │                               style + palette + avoids + occasion
   ▼
explain()                          Gemini lượt 2, chỉ viết "vì sao hợp"
   │                               trên đúng các món đã được chọn
   ▼
Result UI                          mọi gợi ý bấm được sang entity thật
```

**Hai lượt gọi, không phải một.** Lượt đầu phân tích người dùng khi chưa biết catalog
trả về gì. Lượt hai viết lời giải thích khi đã biết chính xác món nào được chọn. Gộp
thành một lượt là nguyên nhân phổ biến khiến sản phẩm loại này gợi ý món không tồn tại.

### Triển khai

- Vercel AI SDK (`ai` + `@ai-sdk/google`), `generateObject` + Zod → structured output
  được ép ở tầng API, không tự parse JSON.
- Model: Gemini Flash-tier multimodal. **Chốt model id lúc implement bằng cách tra API
  docs**, không lấy từ ký ức.
- `StylistProvider` interface của `docs/03` giữ nguyên. Hai implementation:
  - `GeminiStylistProvider` — mặc định khi có `GOOGLE_GENERATIVE_AI_API_KEY`.
  - `DeterministicStylistProvider` — fallback khi lỗi/timeout/vượt hạn mức, dùng cho
    test, và cho người clone repo không có key.
- Stream phần phân tích để người dùng thấy chữ chạy ngay.

### Bốn chỗ phải chặn

1. **Slug bịa.** Output qua Zod *rồi* resolve lại với catalog. Slug lạ bị loại, không
   render. Có unit test giữ invariant này — đây là ràng buộc trung tâm của cả thiết kế.
2. **Quota bị đốt.** Rate limit theo IP bằng sliding window trên Upstash Redis (free
   tier), cap kích thước ảnh và body ở tầng route handler, cộng một bộ đếm lượt gọi
   theo ngày cũng trên Redis; vượt ngưỡng thì chuyển sang fallback thay vì trả lỗi.
3. **Hỏng giữa buổi gặp.** Timeout → fallback tất định, UI nói rõ đang ở chế độ dự
   phòng. Không im lặng giả vờ là AI.
4. **Nội dung không an toàn.** Ràng buộc `docs/07` nằm trong cả prompt và schema: không
   suy luận đặc điểm nhạy cảm, không chấm điểm cơ thể hay ngoại hình. `affinity` là tín
   hiệu xếp hạng nội bộ; copy UI không được trình bày nó như xác suất khách quan.

### Ảnh người dùng

**Không lưu ở đâu cả.** Nhận trong request, gửi Gemini, xong là mất. Không bucket,
không signed URL, không vòng đời cần quản — mạnh hơn yêu cầu "private bucket" của
`docs/07`, và gỡ Supabase Storage khỏi v1.

Đổi lại ảnh có rời khỏi máy người dùng, nên **bắt buộc có dòng disclosure** nói rõ ảnh
được gửi tới Google để phân tích và không được lưu lại. Không log bytes ảnh.

## 5. Catalog và nội dung

### Ngân sách ảnh quyết định khối lượng catalog

| Loại | Số lượng |
|---|---|
| Hero trang chủ | 1 |
| Style hero | 5 |
| Bìa story | 3 |
| Ảnh item | 15 |
| Ảnh outfit | 10 |
| OG image | 1 |
| **Tổng** | **35** |

35 ảnh thì chăm được từng tấm; 80-90 ảnh (quy mô `docs/08`) thì lộ ra là ảnh AI.

15 item chia đều 5 category, **3 item mỗi category**, lấy từ bộ đại diện sẵn có trong
`docs/08`:

| Category | Item |
|---|---|
| Tops | sơ mi trắng, áo lụa, áo dệt kim mỏng |
| Bottoms | quần wide-leg chocolate, quần âu, chân váy midi |
| Dresses | shirt dress, slip dress, A-line dress |
| Outerwear | blazer, trench coat, cardigan mỏng |
| Accessories | loafer, ballet flat, túi có kết cấu |

Sàn 3 item mỗi category là con số có lý do: **3 là số nhỏ nhất khiến một hàng item đọc
ra là có chủ đích.** Một category 2 món đọc ra là "chưa làm xong", bất kể tổng catalog
là bao nhiêu — và đó là chỗ duy nhất độ mỏng thật sự lộ ra, chứ không phải ở tổng số.

**Trang category dùng layout editorial xếp dọc, không dùng lưới** — ảnh lớn cạnh khối
chữ, so le nhau. Ba món ở layout đó đọc ra là được tuyển chọn; ba món trong lưới 3 cột
đọc ra là thiếu hàng. Cùng một lượng nội dung, hai cảm giác trái ngược. Khớp layout
theo lượng nội dung có thật, không phình nội dung cho vừa một template lưới.

Không tăng tiếp quá 15: khách bấm hai phút mở được 3-5 item, nên item thứ 16 trở đi
không ai nhìn thấy mà vẫn tiêu công sức thật.

5 style giữ nguyên `docs/08`: Modern Classic, Quiet Luxury, Minimalist, Soft Feminine,
Casual Chic.

### Ràng buộc suất outfit

10 outfit × ~4 món = **40 suất**. Mỗi item phải xuất hiện trong **tối thiểu 2 outfit**,
nếu không mục "outfit liên quan" ở trang item detail sẽ trống — 15 item × 2 = 30 suất
bắt buộc, còn dư 10.

Số dư đó là chủ đích. Ở mức 8 outfit (32 suất) thì chỉ dư 2, nghĩa là ghép outfit biến
thành bài toán chia suất chứ không còn theo logic phối đồ: sơ mi trắng đáng ra phải có
mặt trong 4-5 look, mà làm vậy là đẩy một món khác xuống dưới sàn. Dư 10 suất cho phép
món trục đi 4-5 look trong khi món kén vẫn đủ 2.

**Sâu thắng rộng.** Độ mỏng được xử lý bằng cách mỗi item có nội dung thật dày, không
bằng cách thêm item mỏng.

**Đòn bẩy rẻ nhất để catalog có cảm giác lớn hơn không phải thêm item, mà là thêm liên
kết giữa các item đang có** — quan hệ màu, dịp, style, "phối với", "đừng phối với".
Mật độ cạnh, không phải số lượng đỉnh. Gần như không tốn ảnh, tốn rất ít chữ, và đúng
là thứ làm Bí Mặc giống một cơ sở tri thức thay vì một danh mục.

### Khối lượng viết

Khoảng **7.000-7.500 từ tiếng Việt chất lượng biên tập**: 15 item × ~250 từ (là gì, đặc
điểm, phối thế nào, nên tránh gì), 5 style × ~250 từ, 3 story × ~600 từ, cộng copy toàn
site. Đây là dòng chi phí lớn nhất của dự án và là thứ người xem đọc trực tiếp.

Quy trình: Claude soạn bản đầu, người biên tập lại giọng. Quy tắc `docs/08` giữ nguyên —
mỗi record phải thể hiện một quan hệ thật trong domain, không lorem ipsum.

**Viết nội dung trên trang đã render, không viết trong file rỗng.** Dựng trang item
detail bằng một item hoàn chỉnh trước, nhìn nó, rồi mới viết 11 cái còn lại.

### Nơi lưu nội dung

Fixture TypeScript có type trong `src/data/fixtures/`, không phải Supabase. Review được
bằng git diff, không hạ tầng, không credential. Lớp repository function là chỗ duy nhất
page gọi vào, nên chuyển sang Postgres sau này chỉ sửa trong `src/data/`.

## 6. Art direction

Chi tiết đầy đủ sẽ nằm ở `docs/13_ART_DIRECTION.md` (viết ở M1). Các luật cố định:

- **Một spec duy nhất** dán vào mọi prompt: ánh sáng, nền, khẩu độ, góc crop, palette
  Warm Ivory / Burgundy / Chocolate / Taupe, tông da và kiểu người mẫu. Đây là thứ biến
  30 ảnh rời thành một bộ.
- **Không có mặt nhận diện được trong khung.** Crop từ vai xuống, chụp sau lưng, nghiêng,
  hoặc mặt ra ngoài khung. Lý do chính: gương mặt AI là dấu hiệu lộ số một. Tác dụng phụ:
  giống editorial fashion thật hơn.
- **Hai lớp ảnh.** Item là ảnh kiểu product trên nền ivory; outfit là look có người mặc.
  Không hứa hai lớp trùng khít từng pixel — web fashion thật cũng khác nhau giữa product
  shot và lookbook shot.
- **Reference conditioning cho ảnh outfit:** đính ảnh item khi sinh ảnh outfit, yêu cầu
  giữ đúng món đó.
- Prompt lưu trong repo cạnh art direction spec để lần sinh lại sau còn khớp.

### Công cụ

ChatGPT Plus (GPT image gen), làm tay. Hệ quả cần thiết kế theo:

- 30 lượt làm tay; file lưu trong `public/images/` theo quy ước tên khớp slug.
- Làm trong **một thread cho mỗi bộ**, art direction spec dán ở tin đầu.
- Độ phân giải ~1024×1536 / 1536×1024: thừa cho item và story, **mỏng cho hero
  full-bleed desktop retina**. Giải pháp thiết kế (ưu tiên): hero là ảnh chiếm một nửa
  khung cạnh khối chữ serif lớn, thay vì ảnh phủ kín khung.
- Một dòng ở footer / trang giới thiệu nói rõ ảnh là AI phục vụ demo. Khách tự nhận ra
  mà không được nói trước thì mất uy tín; nói trước thì thành quyết định sản xuất.

## 7. Kiến trúc

Giữ tinh thần `docs/03`, chỉnh theo việc v1 không bật Supabase.

```text
src/
  app/
    page.tsx                      # home (static)
    wardrobe/[category]/[slug]/   # static, generateStaticParams
    styles/[slug]/                # static
    stories/[slug]/               # static
    stylist/                      # dynamic
    closet/                       # client, localStorage
    api/stylist/route.ts          # POST, streaming, rate-limited
  components/
    layout/ editorial/ wardrobe/ style/ stylist/ closet/ ui/
  features/
    stylist/                      # pipeline: resolve → rank → explain
    closet/                       # localStorage store
  data/
    fixtures/                     # nội dung có type
    index.ts                      # repository functions
  lib/
    ai/                           # CHỈ adapter vendor + Zod schema
    supabase/                     # seam, chưa dùng
  types/
```

**Ranh giới quan trọng nhất:** `lib/ai/` chỉ biết Gemini và schema, **không biết gì về
catalog**. `features/stylist/` là chỗ điều phối resolve/rank/explain và là chỗ duy nhất
biết cả hai phía. Chiều phụ thuộc một hướng: `features/stylist` → `lib/ai` + `data`.
Nhờ vậy đổi vendor chỉ sửa một thư mục, và test được grounding mà không gọi model.

**Rendering.** Nội dung là fixture build-time nên toàn bộ catalog là static — bật tức
thì, không chi phí. Chỉ `/stylist` dynamic. `next/image` trỏ file local trong `public/`,
không cần allowlist domain.

**Client component chỉ ở năm chỗ:** site header (cần `usePathname` cho trạng thái
active), mobile nav, questionnaire + chọn ảnh, kết quả stylist (streaming), nút lưu. Còn
lại Server Component.

Header là client vì `MobileNavigation` đã là client và là con của nó — nhánh đó hydrate dù
sao, nên đẩy header về server chỉ tiết kiệm việc hydrate một wordmark và một div bọc, không
đủ bù một file cùng một lớp gián tiếp. Luật ở đây nhắm vào chuyện đừng biến cả một *trang*
thành client vì một control nhỏ; header không phải một trang.

**Closet không auth.** Store nhỏ có type, chỉ lưu *slug* vào `localStorage`, đọc trong
effect để tránh lệch hydration. `src/lib/supabase/` ở lại như seam có tài liệu — và đó
là câu trả lời tốt khi khách hỏi "muốn tài khoản thật thì sao": chỉ ra đúng chỗ sẽ thay.

### Stack

Next.js App Router · TypeScript strict · Tailwind · pnpm · Zod · Vitest · Playwright ·
Vercel AI SDK + `@ai-sdk/google` · Upstash Redis (rate limit) · Vercel (deploy).
shadcn/ui chỉ khi thật cần một primitive và được restyle.

Font: Cormorant Garamond (display) + Inter (body) — xem `ADR-006`.

## 8. Thứ tự làm

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| **M0** | Scaffold, design token, shell, 5 route shell, homepage bằng khối placeholder, lớp data, **deploy Vercel** | Có URL live đã ra dáng Bí Mặc dù chưa có ảnh thật |
| **M1** | `docs/13_ART_DIRECTION.md` + **lô ảnh thử 4 tấm** (hero, style hero, item, outfit) | 4 tấm nhìn ra một bộ; biết thời gian thật cho mỗi tấm |
| **M2** | Lõi kiến thức: 15 item, 5 style, 10 outfit — đủ nội dung + ảnh. Category, item detail, style detail, cross-link | Đi hết nhiều vòng khám phá không cần AI, không cần login |
| **M3** | AI Stylist: questionnaire, Gemini, grounding + ranking, explain, UI kết quả, fallback, rate limit | Luồng đầy đủ chạy với Gemini thật và chạy được cả khi không có key |
| **M4** | 3 story, closet localStorage, empty state, SEO/OG, accessibility, Playwright demo spec, performance | Đường demo xanh tự động; lint/typecheck/test/build sạch |
| **M5** | Supabase + Auth + persistence thật | Hoãn có chủ đích. Chỉ làm nếu một khách cụ thể hỏi tới |

**M1 nhỏ có chủ đích.** Nó kiểm chứng toàn bộ tiền đề thị giác của dự án với giá rẻ
nhất, trước khi cam kết 30 tấm. Nếu 4 tấm đã rời rạc thì sửa spec, chưa mất gì.

### Bất biến: đường demo hai phút

```text
home → một item → style liên quan → AI Stylist → lưu vào closet
```

Đường này **phải luôn xanh** từ cuối M2 trở đi. Không mốc nào sau đó được làm nó đứt.
Playwright spec ở M4 chỉ là tự động hoá lại đúng đường này. Đây là cách dịch "khách bấm
hai phút rồi quyết định" thành một ràng buộc kiểm được.

## 9. Rủi ro

| Rủi ro | Mức | Cách hạ |
|---|---|---|
| Cạn sức giữa đường (~7.000 từ + 35 ảnh làm tay) | cao | Deploy ở M0 và lô thử ở M1 → dừng ở bất kỳ điểm nào vẫn có thứ gửi được. Dừng sau M2 vẫn là một portfolio ổn |
| Ảnh AI bị nhận ra | trung bình | Không mặt + một art direction + reference conditioning + nói thẳng ở footer |
| Catalog 15 item trông mỏng | thấp | Sàn 3 item/category + layout editorial xếp dọc; sâu thắng rộng; thêm cạnh thay vì thêm đỉnh |
| Quota Gemini bị đốt trên URL public | trung bình | Rate limit IP + cap input + hạn mức ngày → fallback |
| Văn Gemini chung chung | trung bình | Hai lượt gọi; lượt hai bị giới hạn vào đúng các yếu tố `docs/05` liệt kê |
| Gemini hỏng giữa demo | thấp | Fallback tất định, UI nói thật |
| Scope trôi về ecommerce | thấp | `ADR-001` |

## 10. Quyết định cần ghi vào `docs/11_DECISIONS.md`

| ADR | Nội dung | Sửa gì |
|---|---|---|
| 006 | Font: Cormorant Garamond + Inter | mới |
| 007 | Repository function async từ đầu | mới |
| 008 | Chưa dùng route group tới khi có auth | mới |
| 009 | Mục tiêu là portfolio; người xem là khách freelance | thêm vào `docs/00` |
| 010 | Closet không cần auth ở v1, lưu localStorage | sửa `docs/01` |
| 011 | Gemini là provider chính; engine tất định là fallback + test seam | sửa `ADR-003`, `docs/05` |
| 012 | Ảnh người dùng không lưu, xử lý trong RAM | sửa `ADR-005`, `docs/07` |
| 013 | Ảnh AI, art direction khoá cứng, không mặt nhận diện | docs mới `13_ART_DIRECTION.md` |
| 014 | Catalog theo ngân sách ảnh: 15 item (3/category) / 5 style / 10 outfit / 3 story ở v1 | sửa `docs/08` |
| 015 | Deploy từ M0; roadmap sắp lại | sửa `docs/09` |

Để không session nào đọc docs cũ rồi làm sai: chèn **một dòng trỏ** ở đầu mỗi file bị
ảnh hưởng ngay khi spec được duyệt, rồi áp dụng bản sửa đầy đủ ở bước docs của M0.

## 11. Kiểm chứng

Mỗi mốc phải chạy và báo cáo output thật:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Từ M4 thêm `pnpm playwright test` cho đường demo.

Kiểm bằng tay ở mọi mốc: mở URL **đã deploy** trên điện thoại thật, đi đường demo hai
phút, kiểm không link chết, không màn hình lỗi, không yêu cầu đăng nhập, không vỡ
layout ở 360px.

Riêng M3 kiểm thêm: xoá biến môi trường API key → luồng stylist vẫn chạy bằng fallback;
và mọi slug trong kết quả đều dẫn tới một trang thật.

## 12. Những gì không làm trong bản này

- `docs/plans/0001-foundation.md` hiện tại **hết hiệu lực** (nó giả định thứ tự `docs/09`
  và AI mock-first). Viết lại ở bước plan.
- Chưa sửa đầy đủ 7 file docs bị ảnh hưởng — chỉ chèn dòng trỏ, xem §10.
- Repo vừa `git init`, chưa có commit nào. Commit do người quyết định.
