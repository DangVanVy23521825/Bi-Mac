# Bí Mặc — Tủ đồ cá nhân có tài khoản (design spec)

Ngày: 2026-10-31
Trạng thái: chờ duyệt
Thay thế: `ADR-008`, `ADR-009`, `ADR-010`; mở rộng phạm vi `ADR-012`; phần
"auth-để-lưu" trong `docs/01_PRD.md` quay lại hiệu lực; thứ tự mốc trong
`docs/09_MVP_ROADMAP.md` và `docs/12_TASK_BACKLOG.md`.

---

## 1. Vì sao có bản này

Bí Mặc đổi mục tiêu. `ADR-009` ghi mục tiêu là **portfolio** cho khách freelance
xem trong hai phút, và mọi quyết định khác suy ra từ đó — rõ nhất là `ADR-010`
("My Closet v1 không cần đăng nhập", vì "một form đăng nhập giết chết màn demo
portfolio hai phút").

Mục tiêu mới: **sản phẩm cho người dùng thật**. Chủ dự án chấp nhận đánh đổi màn
demo — khi cần cho client xem thì đăng nhập sẵn trước, không cần đường demo
không-đăng-nhập nữa.

Đích cuối mà chủ dự án muốn là một AI stylist dạng **agent chat**: hội thoại nhiều
lượt, có bộ nhớ dài hạn, biết tìm reference trên mạng, và trả lời kèm ảnh outfit
gen từ quần áo thật của người dùng. Đích đó là ba dự án xếp chồng:

1. **Tài khoản + tủ đồ cá nhân thật** — bản spec này.
2. **Agent chat có bộ nhớ và tool** — spec riêng, sau khi (1) xong.
3. **Gen ảnh outfit từ đồ của người dùng** — spec riêng, cần cả (1) và (2).

(2) không chạy được nếu chưa có (1): không có người dùng thì không có gì để nhớ,
và không có tủ đồ thật thì agent vẫn chỉ phối được 15 món catalog. Chủ dự án đã
chọn làm (1) trước. Bản spec này **chỉ** mô tả (1).

## 2. Ý định và tiêu chí thành công

Một người dùng Bí Mặc đăng nhập, chụp quần áo trong tủ nhà mình đưa lên, và AI
phối đồ phối bằng **đồ thật của họ** — không phải bằng 15 món của Bí Mặc.

Thành công đo bằng:

- Một người lạ đăng nhập bằng Google, đưa được 10 món lên tủ, và nhận lại gợi ý
  có mặt đồ của chính họ — không cần hướng dẫn.
- Đưa một món vào tủ mất dưới 15 giây thao tác tay: chụp/chọn ảnh, xem nhãn AI
  điền sẵn, sửa chỗ sai nếu có, lưu.
- Ảnh quần áo của người dùng không ai khác đọc được, kể cả khi biết đường dẫn.
- Người dùng quay lại sau một tuần: tủ đồ còn nguyên, và câu hỏi questionnaire
  không phải trả lời lại từ đầu.
- Người dùng rời đi xoá được tài khoản, và sau đó không còn ảnh nào của họ trong
  bucket lẫn bản ghi nào trong database.
- Catalog, style, outfit, item công khai vẫn mở được không cần session — URL vẫn
  chia sẻ được như hiện tại.
- `pnpm build`, `pnpm test`, `pnpm typecheck` vẫn chạy xanh **khi không có**
  credentials Supabase và không có API key AI.

## 3. Phạm vi

### Trong phạm vi

- Đăng nhập/đăng xuất bằng **Google OAuth** qua Supabase Auth.
- `profiles` — bản ghi người dùng, có `preferences` lưu lần trả lời questionnaire
  gần nhất.
- `closet_items` — quần áo người dùng tự upload, ảnh nằm trong bucket private.
- **AI gắn nhãn tự động** cho ảnh vừa upload; người dùng duyệt và sửa được.
- `saved_items` / `saved_outfits` / `saved_styles` — lưu món/bộ/style của Bí Mặc.
- Trang `/closet` thành thật: xem, thêm, sửa nhãn, xoá — giữ cấu trúc
  `/closet/{items,looks,styles}` mà `docs/02_INFORMATION_ARCHITECTURE.md` đã định,
  và món tự upload là một mục riêng, không trộn vào món Bí Mặc đã lưu.
- **AI phối đồ hiện tại đọc được tủ đồ cá nhân** và dùng đồ thật của người dùng
  trong kết quả.
- RLS trên mọi bảng thuộc người dùng, có test chứng minh hai người dùng không
  đọc được dữ liệu của nhau.
- **Xoá tài khoản** — xem §6.8.

### Ngoài phạm vi (và vì sao)

- **Chat nhiều lượt, bộ nhớ hội thoại, tool web search** — dự án (2).
- **Gen ảnh outfit** — dự án (3).
- **Ảnh người/khuôn mặt trong tủ đồ.** Tủ đồ chỉ chứa ảnh quần áo. Ảnh cơ thể
  người dùng gửi cho AI phối đồ vẫn giữ nguyên `ADR-012`: nhận trong request,
  gửi cho model, bỏ đi, không lưu.
- **Một ảnh nhiều món.** Bản này một ảnh là một món. Chụp cả tủ rồi tách món là
  việc khác, khó hơn, và không cần để chứng minh luồng chạy.
- **Chuyển catalog vào Postgres.** Catalog vẫn là fixtures TypeScript trong
  `src/data/fixtures/` — xem §6.2.
- **Nội dung editorial Stories** và route `/stories/[slug]` — vẫn chưa làm, không
  thuộc bản này.
- Đăng nhập bằng email/mật khẩu hoặc magic link. Chỉ Google OAuth.

### Anti-goal — thứ làm xong mà vẫn là thất bại

- Tủ đồ rỗng. Nếu đưa một món vào tủ mà phải điền form dài, người dùng bỏ giữa
  đường, và agent ở dự án (2) không có gì để phối. Đây là lý do nhãn phải do AI
  điền trước.
- AI gắn nhãn sai mà người dùng không sửa được → agent phối sai, và lỗi đó đổ lên
  đầu sản phẩm. Sửa nhãn là tính năng bắt buộc, không phải tuỳ chọn.
- Dùng ảnh quần áo để suy luận chuyện cá nhân (dáng người, thu nhập, tôn giáo,
  sức khoẻ). `docs/07_SECURITY_PRIVACY.md` cấm, và prompt gắn nhãn phải bị giới
  hạn vào thuộc tính món đồ.
- Ảnh tủ đồ lọt ra public, dù chỉ một đường dẫn đoán được.
- Repo không còn chạy được khi thiếu credentials. `CLAUDE.md` yêu cầu app boot và
  pass test không cần Supabase — yêu cầu này không được đánh đổi.

## 4. Ràng buộc

1. **Chạy được khi không có credentials.** Thiếu biến môi trường Supabase: đăng
   nhập tắt, `/closet` hiện trạng thái "chưa cấu hình", AI phối đồ chạy
   catalog-only như hôm nay. Không crash, không màn hình lỗi.
2. **Thiếu AI key vẫn chạy.** Gắn nhãn tự động không có key thì trả về món "chưa
   gắn nhãn" để người dùng tự điền — giống tinh thần `ADR-011`/`ADR-018`.
3. **Trang công khai vẫn công khai.** `/`, `/wardrobe/*`, `/styles/*` không được
   đòi session.
4. **Ảnh người dùng là dữ liệu riêng tư.** Bucket private, không có URL công
   khai, service-role key không bao giờ xuống client (`docs/07`).
5. **Runtime Node.js mặc định.** Không set `runtime = 'edge'`.
6. Giữ nguyên các mẫu đang chạy tốt: provider seam trong `src/lib/ai/`, validate
   bằng Zod ở biên HTTP, rate limit, fallback deterministic.

## 5. Phần "làm thế nào" đã chốt

Chủ dự án chốt: **Supabase** (auth + Postgres + Storage), **Google OAuth** là cách
đăng nhập duy nhất, **AI gắn nhãn trước — người dùng sửa sau**, và **AI phối đồ
hiện tại phải dùng được tủ đồ cá nhân ngay trong bản này** (để bản này tự nó đáng
ship, không phải chờ agent).

Có một đoạn **chỉ con người làm được**: tạo project Supabase, và tạo OAuth client
trên Google Cloud Console rồi dán client ID/secret vào Supabase. Người triển khai
phải cung cấp một script dẫn từng bước thay vì mô tả bằng văn bản.

## 6. Thiết kế

### 6.1 Ranh giới route

`ADR-008` hoãn route group `(public)`/`(account)` vì "v1 chưa có vùng cần đăng
nhập". Giờ có. Dựng hai group, hoặc một middleware/proxy chặn đúng `/closet`.
Người triển khai chọn, nhưng ranh giới phải nằm ở **một chỗ**, không rải rác
từng trang.

### 6.2 Lưu món Bí Mặc đã lưu: dùng slug, không dùng khoá ngoại

`docs/04_DATA_MODEL.md` thiết kế `saved_items` với `fashion_item_id` trỏ sang bảng
`fashion_items` trong Postgres. Bảng đó **không tồn tại** — catalog đang nằm trong
`src/data/fixtures/`, không trong database.

Quyết định: `saved_items` lưu **slug dạng text** (`item_slug`), không khoá ngoại.
Tính hợp lệ kiểm ở tầng app bằng chính fixtures. Lý do: chuyển toàn bộ catalog vào
Postgres là một dự án riêng, và nó không giúp gì cho mục tiêu của bản này. Hệ quả
phải nhận: database có thể chứa slug của món đã bị xoá khỏi fixtures — khi đọc,
slug không khớp thì bỏ qua, không báo lỗi.

Giữ `unique (user_id, item_slug)` như `docs/04` đã định. Tương tự cho outfit và
style.

### 6.3 `closet_items`

Mỗi món dùng **đúng bộ từ vựng của catalog** — `CategorySlug`, `Occasion`, `Fit`,
`ItemAttribute` trong `src/types/stylist.ts` và `src/types/content.ts`, cùng
`colorSlugs` khớp `src/data/fixtures/colors.ts`. Đây là điều kiện để §6.6 chạy
được: ranker hiện tại đọc đúng những trường này, nên món cá nhân phải nói cùng
ngôn ngữ, không phải text tự do.

Mỗi món cần: chủ sở hữu, tên (tiếng Việt), đường dẫn ảnh trong bucket, category,
màu, style, dịp mặc, form, thuộc tính, ghi chú tuỳ chọn, và **nguồn nhãn** — AI
điền hay người dùng đã sửa. Nguồn nhãn không phải để trang trí: nó cho biết nhãn
nào đáng tin, và dự án (2) sẽ cần nó để biết nên hỏi lại người dùng về món nào.

Một chỗ dễ hiểu nhầm: `ItemAttribute` (`sleeveless`, `sheer`, `clingy`,
`structured-shoulder`, `cropped`, `high-heel`, `short-hem`, `bright-color`) **không
phải** từ vựng mô tả chất liệu — nó là từ vựng *loại trừ* mà `ADR-016` dùng để bỏ
món người dùng muốn tránh. Và `FashionItem` hiện **không có trường chất liệu nào
cả**. Nếu tủ đồ thật cần "vải tweed", "lụa", "denim" thì đó là trường mới, phải
thêm có chủ đích — đừng nhét chất liệu vào `attributes`.

Ảnh đặt trong bucket private theo đường dẫn có `user_id` ở segment đầu, để policy
storage so khớp được chủ sở hữu. Trình bày cho client bằng **signed URL hạn ngắn
sinh ở server**, không bao giờ bằng public URL.

### 6.4 Luồng đưa một món vào tủ

Người dùng chọn/chụp ảnh → ảnh lên bucket → server gọi AI gắn nhãn → trả về bản
nháp đã điền sẵn → người dùng xem, sửa chỗ sai, lưu.

**Ảnh đi thẳng từ trình duyệt lên bucket**, không đi xuyên qua một route Next.
Hai lý do: body của một Vercel Function bị chặn ở 4.5MB còn `MAX_PHOTO_BYTES` đã
là 4MB — quá sát; và proxy bytes qua server chẳng được gì khi RLS trên storage đã
bắt đúng chủ sở hữu. Endpoint gắn nhãn vì vậy nhận **đường dẫn trong bucket**, không
nhận bytes.

Bản nháp hiện ra **đã điền**, không phải form trống. Người dùng chỉ cần bấm lưu
khi AI đúng — đó là chỗ quyết định tủ đồ có đầy hay không (§3, anti-goal).

Giới hạn ảnh dùng lại `ALLOWED_PHOTO_TYPES` và `MAX_PHOTO_BYTES` trong
`src/features/stylist/photo-limits.ts` — một nguồn, không định nghĩa lần hai.

### 6.5 AI gắn nhãn

Thêm năng lực mới vào provider seam `src/lib/ai/` (cạnh `analyze`/`explain` hiện
có), **không** gọi model trực tiếp từ route hay component.

Output phải ràng vào schema Zod chỉ nhận giá trị thuộc từ vựng ở §6.3 — enum, không
phải string. Model không được phép phát minh category hay màu mới; giá trị lạ thì
bỏ, không nhận. Đây là cùng một nguyên tắc với `ADR-018` (không token-stream vì
không validate được). Tên món và ghi chú trả về bằng **tiếng Việt**.

**Nới từ vựng:** `Occasion`, `ItemAttribute`, và danh sách màu được phép mở rộng
trong dự án này nếu tủ thật đòi (xem §9) — nhưng `OCCASIONS` trong
`src/types/stylist.ts` là nguồn duy nhất và có nhiều bản sao soi chiếu nó, nên sửa
phải sửa ở đó. `CategorySlug` thì **không**: nó là một segment URL công khai
(`/wardrobe/[category]`), đổi nó là đổi URL của người khác, cần một quyết định riêng.

Prompt chỉ được hỏi về **món đồ**: nó là gì, màu gì, chất liệu/thuộc tính gì, mặc
dịp nào. Không mô tả người, không suy luận gì về chủ sở hữu (§3, `docs/07`).

Không key, hoặc model lỗi/timeout/hết quota: trả bản nháp trống kèm lý do, người
dùng tự điền. Không bao giờ trả lỗi chặn đường.

Endpoint gắn nhãn phải có rate limit riêng — nó tốn tiền và đứng sau một nút bấm
được. Giờ đã có tài khoản, giới hạn nên tính **theo người dùng và lưu trong
Postgres**, không dùng bộ đếm trong RAM của `src/lib/rate-limit/`: bộ đếm đó mất
khi instance chết và không dùng chung giữa các instance trên Vercel (hạn chế này
đã ghi sẵn trong `src/lib/rate-limit/index.ts`).

### 6.6 AI phối đồ dùng đồ của người dùng

Pipeline hiện tại nhận `StylistCatalog` (`src/features/stylist/resolve.ts`) gồm
`items` / `outfits` / `styles` / `colors`, và `rankItems` / `rankOutfits`
(`src/features/stylist/rank.ts`) xếp hạng trên đó.

Hai điều người triển khai phải xử lý:

**Món cá nhân không phải `FashionItem`.** `FashionItem` có các trường biên tập —
`whatItIs`, `howToStyle`, `whatToAvoid`, `excerpt`, `characteristics` — mà áo của
người dùng không có. **Không** bịa nội dung biên tập cho món cá nhân. Hướng đúng:
tách ra phần trường mà `rank.ts` thật sự đọc, cho ranker nhận phần đó, rồi đưa cả
món catalog và món cá nhân vào. Đọc `rank.ts` trước khi quyết hình dạng type.

**Món cá nhân không thuộc bộ nào.** `rankOutfits` xếp hạng outfit catalog qua
`itemSlugs`; đồ của người dùng không nằm trong outfit nào. Bản này: outfit vẫn
xếp hạng trên catalog, món cá nhân đi qua đường `rankItems`. Kết quả hiện hai
nhóm tách bạch — bộ Bí Mặc gợi ý, và món trong tủ bạn dùng được — và **nói rõ
món nào là của bạn**. Ghép món cá nhân thành một bộ hoàn chỉnh là việc của dự án
(3), nơi có gen ảnh để thể hiện.

Chưa đăng nhập, hoặc tủ rỗng: chạy đúng như hôm nay. Không có đường code nào bắt
buộc phải có tủ đồ.

### 6.7 Hạt giống của bộ nhớ

Lưu lần trả lời questionnaire gần nhất vào `profiles.preferences`, và điền sẵn khi
người dùng quay lại. Đây là phần "nhớ được người dùng qua nhiều ngày" nhỏ nhất mà
bản này làm được, và là chỗ dự án (2) sẽ cắm bộ nhớ dài hạn vào. Không thiết kế
schema bộ nhớ hội thoại ở bản này — chưa biết agent cần gì.

### 6.8 Xoá tài khoản

Người dùng phải tự xoá được tài khoản mình, và xoá là **xoá thật**: mọi bản ghi
trong `profiles`, `closet_items`, `saved_*`, **và mọi file ảnh trong bucket** đều
đi, không phải đánh dấu ẩn rồi giữ lại.

Hai cái bẫy người triển khai phải xử lý:

- **Xoá hàng trong database không xoá file trong Storage.** Bucket là một hệ
  thống riêng; `on delete cascade` không chạm tới nó. Phải có một bước dọn bucket
  rõ ràng, và nó phải chạy *trước* khi mất bản ghi chứa đường dẫn ảnh — nếu không,
  ảnh thành rác không ai biết đường tìm.
- **Xoá một user trong `auth.users` cần quyền cao hơn session của chính họ.** Việc
  này chạy ở server. Service-role key không bao giờ xuống client (`docs/07`), nên
  biên "ai được xoá ai" phải kiểm ngay tại server: chỉ xoá được chính mình.

Luồng này phải có một bước xác nhận không bấm nhầm được, và phải nói trước là
không hoàn tác được.

## 7. Quyết định cần ghi vào `docs/11_DECISIONS.md`

- Thay `ADR-009`: mục tiêu là sản phẩm cho người dùng thật, không còn là portfolio.
- Thay `ADR-010`: tủ đồ cần đăng nhập; `localStorage` (vốn chưa từng được code)
  bị bỏ.
- Thay `ADR-008`: dựng ranh giới route cho vùng cần đăng nhập.
- Mở rộng `ADR-012`: ảnh **quần áo** được lưu trong bucket private; ảnh **cơ thể**
  gửi cho AI phối đồ vẫn không bao giờ lưu.
- Mới: món Bí Mặc đã lưu dùng slug text, không khoá ngoại (§6.2).
- Mới: AI gắn nhãn trước, người dùng sửa sau; nguồn nhãn được lưu lại.
- Mới: app phải chạy được khi thiếu credentials Supabase.
- Mới: người dùng xoá được tài khoản, và xoá là xoá thật cả database lẫn bucket.

## 8. Kiểm chứng

- Vitest cho tầng dữ liệu, qua một seam giả lập client Supabase — test không được
  gọi database thật.
- Test RLS với **hai** người dùng, chứng minh người A không đọc/sửa/xoá được dữ
  liệu và ảnh của người B. Test này cần credentials thật nên phải tự bỏ qua khi
  thiếu env, giống cách `src/lib/ai/gemini.test.ts` xử lý key.
- Playwright cho luồng đã đăng nhập: thêm món → sửa nhãn → phối đồ thấy món đó.
- Test xoá tài khoản phải kiểm **cả hai phía**: không còn hàng trong database, và
  không còn file trong bucket. Chỉ kiểm database là test sẽ xanh trong khi ảnh vẫn
  nằm đó.
- Chạy `pnpm build && pnpm test && pnpm typecheck` trong shell **không có** biến
  Supabase và **không có** AI key, phải xanh.

## 9. Rủi ro

- **Nhãn AI sai nhiều hơn dự tính.** Nếu người dùng phải sửa gần hết, luồng "AI
  điền trước" mất lý do tồn tại. Đo sớm trên ảnh chụp bằng điện thoại trong nhà,
  đèn vàng, nền bừa — không đo trên ảnh sản phẩm nền trắng.
- **Từ vựng catalog quá hẹp cho tủ thật.** 15 món Bí Mặc không phủ hết quần áo
  người Việt mặc. Khi model buộc phải chọn trong enum, nó sẽ nhét món lạ vào ô gần
  nhất. Mở rộng từ vựng có thể là việc phải làm trước, không phải sau.
- **Trống trải lúc mới vào.** Tủ rỗng thì AI phối đồ không khác gì hôm nay. Trang
  `/closet` lúc rỗng phải dẫn người dùng đi thêm món, không phải chỉ thông báo rỗng.
- **Chi phí gắn nhãn.** Một người dùng upload 40 ảnh là 40 lượt gọi model.

## 10. Để người triển khai quyết

- Chặn đường bằng route group hay bằng middleware/proxy (§6.1).
- Hình dạng type cho món xếp hạng được, sau khi đọc `rank.ts` (§6.6).
- Đặt tên bảng/cột, viết migration, và cách seed.
- Hạn của signed URL, và chỗ sinh nó.
- Cơ chế xoá tài khoản: route thường, server action, hay Postgres trigger/Edge
  Function — miễn là đạt §6.8.
- Trần số món mỗi người dùng.
- Upload từng ảnh hay chọn nhiều ảnh một lượt.
- Có thêm trường chất liệu hay không, và nếu có thì từ vựng gồm những gì (§6.3).
- Toàn bộ layout và copy của `/closet` — `docs/06_DESIGN_SYSTEM.md` là nguồn cho
  hình thức, và sản phẩm phải giữ giọng biên tập, không ra giọng dashboard.
