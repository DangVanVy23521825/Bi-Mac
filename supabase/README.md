# Supabase — schema, RLS và bucket

Thư mục này chứa schema của phần cần tài khoản: tủ đồ cá nhân, món Bí Mặc đã
lưu, và bucket private cho ảnh quần áo người dùng tự upload.

App **không** cần Supabase để chạy. Thiếu biến môi trường thì seam trong
`src/lib/supabase/` trả `null`, `/closet` hiện trạng thái "chưa cấu hình", và
`pnpm build && pnpm test && pnpm typecheck` vẫn xanh. Mọi thứ dưới đây là để
bật thêm tính năng, không phải điều kiện để repo hoạt động.

## Dựng từ đầu

```bash
bash scripts/setup-supabase.sh
```

Script dẫn qua sáu bước: tạo project Supabase → lấy URL + anon key →
service_role key → tạo OAuth client trên Google Cloud → bật provider Google
trong Supabase → áp migration. Hai bước giữa là phần **chỉ con người làm
được** (không API nào tạo OAuth client thay bạn), nên script mở đúng trang và
dừng chờ ở từng bước thay vì mô tả bằng văn bản.

Script ghi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` vào `.env.local`. Nó không in và không log giá trị
nào nó đọc được; client ID/secret của Google thì không đi qua máy bạn chút nào
— dán trực tiếp từ Google Cloud sang dashboard Supabase.

## Áp migration bằng tay

Có Supabase CLI:

```bash
supabase init                        # chỉ lần đầu — xem ghi chú bên dưới
supabase link --project-ref <ref>
supabase db push
```

Repo này **cố ý** chỉ commit `supabase/migrations/` chứ không commit
`supabase/config.toml` (file đó mang cấu hình của stack local, không phải của
schema). Mà `supabase link`/`supabase db push` thì đòi có `config.toml`, nên
bỏ `supabase init` ra là `link` sẽ dừng ngay. `supabase init` chỉ tạo thêm
`config.toml` bên cạnh `migrations/`, không ghi đè gì trong đó.

Không có CLI: mở SQL editor trên dashboard, dán toàn bộ
`migrations/0001_account_and_closet.sql`, bấm Run. Migration viết để chạy một
lần; chạy lại sẽ báo `already exists`.

Nếu `supabase db push` báo lỗi quyền ở phần `storage.*` (một số project đặt
`storage.objects` thuộc `supabase_storage_admin`), chạy riêng phần bucket +
policy storage ở cuối file trong SQL editor của dashboard — ở đó lệnh chạy
bằng role owner của project.

## Migration bảo đảm những gì

Đây là danh sách để người review đọc file SQL mà đối chiếu được, không phải mô
tả thay cho việc đọc:

| Bất biến | Chỗ thi hành |
|---|---|
| Năm bảng đều bật RLS | `alter table … enable row level security` (một dòng cho mỗi bảng) |
| Chỉ chủ sở hữu đọc/ghi/sửa/xoá | bốn policy mỗi bảng, `to authenticated`, so khớp `(select auth.uid())` |
| Không ghi được hàng đứng tên người khác | `with check` trên mọi policy `insert` và `update` |
| Khách chưa đăng nhập không chạm được | `revoke all … from anon` + mọi policy giới hạn `to authenticated` |
| Không lưu trùng một slug | khoá chính tổ hợp `(user_id, <slug>)` trên ba bảng `saved_*` |
| Xoá tài khoản là dọn sạch database | `on delete cascade` từ `auth.users` xuống cả năm bảng |
| Ảnh không công khai | `storage.buckets.public = false` |
| Ảnh chỉ chủ sở hữu đọc được | policy `storage.objects` so khớp `auth.uid()::text = (storage.foldername(name))[1]` |
| Không có hàng trỏ vào ảnh người khác | check constraint `closet_items_image_path_in_own_folder` |
| AI không ghi được giá trị ngoài từ vựng | check constraint cho `category`, `fit`, `occasions`, `attributes`, `label_source` |
| File quá lớn / sai định dạng bị chặn | `file_size_limit` + `allowed_mime_types` trên bucket |

Hai chỗ **không** ràng ở database, có chủ đích: `color_slugs` và `style_slugs`
là dữ liệu fixture (`src/data/fixtures/`), không phải union đóng trong type, và
spec §6.2 đã chốt rằng slug catalog được kiểm ở tầng app. Ràng chúng ở đây sẽ
biến mỗi lần thêm một màu thành một migration.

Xoá tài khoản cần **hai** việc, không phải một: `on delete cascade` dọn năm
bảng nhưng không chạm Storage. Dọn bucket là một bước riêng trong code (Task
13), và nó phải chạy *trước* khi mất bản ghi chứa đường dẫn ảnh.

## Kiểm chứng RLS trên project thật

`src/lib/supabase/rls.integration.test.ts` tạo **hai** người dùng thật rồi thử
cho A chĩa vào dữ liệu của B — đọc, sửa, xoá, ghi hàng đứng tên B, tải ảnh, ký
signed URL, upload vào thư mục của B. Nó tự bỏ qua khi thiếu env, nên cần nạp
biến vào shell (vitest không đọc `.env.local`):

```bash
set -a; source .env.local; set +a
pnpm vitest run src/lib/supabase/rls.integration.test.ts
```

Báo `skipped` nghĩa là shell chưa có đủ ba biến — không phải test đã đậu. Test
dọn sau khi chạy: xoá file đã upload rồi xoá hai user vừa tạo (dọn từng user
độc lập, nên một lần setup gãy nửa đường không để lại user rác).

Rồi kiểm bằng mắt trên dashboard bốn thứ — test không thấy được chúng:

- **Storage → Buckets** → `closet` phải là **Private**. Nếu là Public thì dừng
  lại: ảnh quần áo của người dùng đang công khai.
- **Storage → Policies** → `storage.objects` phải hiện **RLS enabled**, và có
  bốn policy `closet_objects_*`. RLS tắt ở bảng này thì bốn policy đó vô hiệu
  và mọi người dùng đã đăng nhập đọc được ảnh của nhau — migration có một
  `do $$ … $$` khẳng định việc này lúc áp, nhưng nó không bắt được việc ai đó
  tắt RLS *sau* khi migration chạy.
- **Database → Policies** → cả năm bảng hiện **RLS enabled**, mỗi bảng 4 policy.
- **Authentication → Providers / URL Configuration** → Google đang Enabled, và
  `http://localhost:3000/auth/callback` có trong Redirect URLs.

## `0002_ai_usage.sql` — hạn mức gọi model theo người dùng

Bảng riêng, migration riêng (Task 6) — không nằm trong `0001` vì lý do đã nói
ở trên: `0001` có thể đã được áp lên project thật, và migration đã áp thì
không sửa, chỉ thêm file mới.

`ai_usage(user_id, day, count)` cùng khuôn bảo đảm với năm bảng ở `0001`: bật
RLS, `revoke all` trước khi `grant` lại đúng ba quyền cần (`select`,
`insert`, `update` — không có `delete`, vì không tính năng nào xoá hàng hạn
mức), và một `do $$ … $$` tự khẳng định lúc áp rằng `anon`/`authenticated`
không còn `TRUNCATE`/`REFERENCES`/`TRIGGER`/`DELETE`. Khoá chính tổ hợp
`(user_id, day)` vừa là ràng buộc unique mà spec đòi, vừa là đích cho
`upsert(..., { onConflict: 'user_id,day' })` ở `src/features/closet/quota.ts`.

## `0003_ai_usage_lock_down.sql` — để người dùng không tự reset được hạn mức

Review toàn nhánh tìm ra: với hai quyền `insert`/`update` mà `0002` cấp cho
`authenticated`, chính người bị giới hạn tự xoá được giới hạn của mình. Anon
key là `NEXT_PUBLIC_`, PostgREST phơi cả schema `public`, nên một người đã
đăng nhập chỉ cần `PATCH /rest/v1/ai_usage?user_id=eq.<chính mình>` với
`{"count": 0}` — policy cho qua, vì hàng đó đúng là của họ — rồi gọi lại
`/api/closet/tag` từ đầu. `/api/closet/tag` không có giới hạn theo IP cũng
không có giới hạn toàn hệ thống, nên đó là trần chi phí Gemini vision duy
nhất, và nó mở.

Migration này đóng lại bằng ba mảnh đi liền nhau: `increment_ai_usage` thành
`security definer` (để hàm còn ghi được sau khi client mất quyền ghi), thêm
`p_user_id = auth.uid()` ngay dòng đầu thân hàm (vì `security definer` bỏ qua
RLS, nên `with check` không còn là thứ chặn mạo danh), và `revoke insert,
update … from authenticated`. Sau migration này, quyền của `authenticated`
trên `ai_usage` chỉ còn `select` — đường duy nhất ghi vào bảng là gọi hàm, và
hàm chỉ biết "+1, cho chính người gọi, hôm nay".

Hệ quả cần biết khi vận hành: `increment_ai_usage` giờ **chỉ** gọi được từ
một phiên đăng nhập thật. Gọi bằng `service_role` (nơi `auth.uid()` là null)
sẽ `raise exception` — đúng ý muốn. Cần sửa hạn mức bằng tay thì dùng
`service_role` ghi thẳng vào bảng, đừng nới kiểm tra trong hàm.
