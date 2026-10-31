-- 0001_account_and_closet.sql
--
-- Tài khoản + tủ đồ cá nhân: năm bảng thuộc sở hữu người dùng và một bucket
-- private cho ảnh quần áo.
--
-- Ảnh quần áo là dữ liệu riêng tư (docs/07_SECURITY_PRIVACY.md). Giả định
-- nền của file này: **mọi** truy vấn từ app đều đi bằng session của chính
-- người dùng (role `authenticated`, qua anon key), nên RLS là lớp chặn cuối
-- cùng và duy nhất mà kẻ tấn công không vòng qua được. Tầng app vẫn kèm
-- `.eq('user_id', …)` ở mọi query (Review Focus #2) — nhưng đó là lớp thứ
-- hai, không phải lớp duy nhất, và file này không được phép dựa vào nó.
--
-- Ba điểm dễ sai, nói trước để người đọc kiểm được:
--
--  1. `enable row level security` phải có trên cả năm bảng. Một bảng có đủ
--     policy mà quên dòng này thì policy không bao giờ được đánh giá và bảng
--     mở toang cho mọi người dùng đã đăng nhập.
--  2. `insert`/`update` phải có `with check`, không chỉ `using`. `using` quyết
--     định *hàng nào được nhìn thấy / được nhắm tới*; `with check` quyết định
--     *hàng sau khi ghi được phép trông như thế nào*. Thiếu `with check`,
--     người dùng A ghi được hàng đứng tên B (A không bao giờ đọc lại được
--     hàng đó, nhưng nó nằm trong tủ của B) — và `update` thiếu `with check`
--     thì A sửa `user_id` của hàng mình thành B, tức là chuyển nhà cho hàng.
--  3. Policy storage so khớp `(storage.foldername(name))[1]` nên đường dẫn ảnh
--     buộc phải có `user_id` ở segment đầu. Bảng `closet_items` có thêm một
--     check constraint ép đúng điều đó, để không tồn tại hàng trỏ vào ảnh của
--     người khác ngay từ trong database.
--
-- Từ vựng (`category`, `fit`, `occasions`, `attributes`, `label_source`) là
-- check constraint, không phải text tự do: AI gắn nhãn sẽ ghi vào đây và nó
-- không được phép phát minh giá trị mới (spec §6.5). Nguồn của từng tập giá
-- trị nằm trong TypeScript và phải khớp đúng:
--   category     → `CategorySlug`  (src/types/content.ts)
--   fit          → `Fit`           (src/types/stylist.ts)
--   occasions    → `OCCASIONS`     (src/types/stylist.ts)
--   attributes   → `ItemAttribute` (src/types/stylist.ts)
--   label_source → `LabelSource`   (src/types/closet.ts, Task 4)
-- Ngược lại, `color_slugs`/`style_slugs` **không** có constraint: chúng là dữ
-- liệu fixture (src/data/fixtures/) chứ không phải union đóng trong type, và
-- spec §6.2 đã chốt rằng slug catalog được kiểm ở tầng app bằng chính
-- fixtures. Ràng chúng ở đây sẽ biến mỗi lần thêm một màu thành một migration.

-- ────────────────────────────────────────────────────────────────────────────
-- Tiện ích dùng chung
-- ────────────────────────────────────────────────────────────────────────────

-- `updated_at` chỉ đáng tin nếu có người set nó. Để app tự set là để nó lệch.
-- `search_path = ''` cho cả hàm trigger (dù thân hàm chỉ chạm `new`) là thói
-- quen bắt buộc với hàm nằm trong đường đi của dữ liệu người dùng.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────────────

-- `id` vừa là khoá chính vừa là khoá ngoại sang `auth.users`: một người dùng
-- có đúng một profile, và `on delete cascade` khiến xoá tài khoản tự dọn hàng
-- này (Task 13 dựa vào đúng tính chất đó cho cả năm bảng).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  -- Lần trả lời questionnaire gần nhất (spec §6.7). `jsonb` chứ không phải
  -- cột riêng từng câu: hình dạng câu trả lời còn đổi, và tầng app luôn
  -- validate lại bằng `stylistAnswersSchema` khi đọc (Task 12), nên dữ liệu
  -- cũ không hợp schema chỉ bị bỏ qua chứ không làm vỡ gì.
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Mỗi tài khoản mới có ngay một hàng profile. Vì sao cần trigger thay vì để
-- app tự insert: nếu profile chỉ xuất hiện khi app nhớ ghi, thì một `update
-- profiles set preferences = …` trên tài khoản chưa có hàng sẽ ảnh hưởng 0
-- hàng và **không báo lỗi** — mất dữ liệu im lặng. Có trigger thì hàng luôn
-- tồn tại.
--
-- `security definer` là bắt buộc: lệnh insert vào `auth.users` chạy bằng role
-- của hệ thống auth, role đó không có quyền ghi vào `public.profiles`.
-- Kèm `search_path = ''` để một schema do người dùng tạo không chen vào được
-- đường phân giải tên trong hàm chạy với quyền owner. Hàm chỉ ghi được đúng
-- hàng của `new.id`, không nhận tham số nào từ bên ngoài, nên không có bề mặt
-- nào để lạm dụng.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- closet_items — món quần áo của chính người dùng
-- ────────────────────────────────────────────────────────────────────────────

create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- Đường dẫn trong bucket `closet`, không phải URL. Client chỉ bao giờ nhận
  -- signed URL hạn ngắn sinh ở server (spec §6.3).
  image_path text not null,
  category text not null,
  color_slugs text[] not null default '{}',
  style_slugs text[] not null default '{}',
  occasions text[] not null default '{}',
  fit text,
  attributes text[] not null default '{}',
  note text,
  label_source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint closet_items_name_not_blank
    check (length(btrim(name)) > 0),

  -- Hệ quả an toàn: không tồn tại được hàng trong tủ của A mà trỏ vào ảnh của
  -- B, kể cả khi app có bug ở chỗ dựng đường dẫn. Cho phép thư mục con
  -- (`<uid>/2026/x.png`) vì chúng vẫn nằm trong thư mục của chủ sở hữu.
  --
  -- Viết bằng `strpos(...) = 1` thay vì `like <uid> || '/%'` hay
  -- `starts_with(...)` là có lý do: check constraint chỉ nhận hàm IMMUTABLE,
  -- và `strpos` chắc chắn immutable (so byte, không phụ thuộc collation).
  -- `like` cũng được nhưng buộc người đọc phải tự xác minh rằng text của một
  -- uuid không chứa `%`/`_` — một lập luận không cần thiết khi có cách viết
  -- không có wildcard nào cả.
  constraint closet_items_image_path_in_own_folder
    check (strpos(image_path, user_id::text || '/') = 1),

  -- `CategorySlug` (src/types/content.ts). Cũng là segment URL công khai nên
  -- tập giá trị này không được đổi tuỳ tiện.
  constraint closet_items_category_check
    check (category in ('tops', 'bottoms', 'dresses', 'outerwear', 'accessories')),

  -- `Fit | null` (src/types/stylist.ts). `null` là hợp lệ: AI có thể không
  -- đoán được form, và người dùng được phép để trống.
  constraint closet_items_fit_check
    check (fit is null or fit in ('fitted', 'relaxed', 'oversized')),

  -- `OCCASIONS` (src/types/stylist.ts). `<@` là "mọi phần tử đều thuộc tập
  -- bên phải", nên mảng rỗng hợp lệ còn một phần tử lạ thì bị chặn.
  constraint closet_items_occasions_check
    check (occasions <@ array['work', 'school', 'casual', 'date', 'event']::text[]),

  -- `ItemAttribute` (src/types/stylist.ts). Đây là từ vựng *loại trừ* mà
  -- ranker dùng để bỏ món người dùng muốn tránh (ADR-016) — không phải từ
  -- vựng chất liệu. Không nhét 'lụa'/'denim' vào đây.
  constraint closet_items_attributes_check
    check (attributes <@ array[
      'sleeveless', 'sheer', 'clingy', 'structured-shoulder',
      'cropped', 'high-heel', 'short-hem', 'bright-color'
    ]::text[]),

  -- `LabelSource` (Task 4): nhãn do AI điền, hay người dùng đã sửa.
  constraint closet_items_label_source_check
    check (label_source in ('ai', 'user'))
);

create trigger closet_items_set_updated_at
  before update on public.closet_items
  for each row execute function public.set_updated_at();

-- Mọi lần đọc là "tủ của tôi, mới nhất trước". RLS tự thêm điều kiện
-- `user_id = auth.uid()` vào mọi truy vấn, nên index dẫn đầu bằng `user_id`
-- là index duy nhất cần có ngoài khoá chính.
create index closet_items_user_id_created_at_idx
  on public.closet_items (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- saved_items / saved_outfits / saved_styles — món của Bí Mặc đã lưu
-- ────────────────────────────────────────────────────────────────────────────
--
-- Lưu **slug dạng text**, không khoá ngoại: catalog nằm trong
-- `src/data/fixtures/`, không trong Postgres, nên không có bảng nào để trỏ
-- tới (spec §6.2). Hệ quả đã nhận: database có thể giữ slug của món đã bị xoá
-- khỏi fixtures; khi đọc, tầng app bỏ qua slug không khớp chứ không báo lỗi.
--
-- Khoá chính tổ hợp `(user_id, <slug>)` **chính là** ràng buộc
-- `unique (user_id, item_slug)` mà spec §6.2 giữ lại từ
-- docs/04_DATA_MODEL.md (chỉ đổi `fashion_item_id` thành `item_slug`): không
-- cần thêm cột `id` surrogate cho một bảng chỉ có hai cột khoá, và nó cho
-- luôn index để tra "người này đã lưu món này chưa".

create table public.saved_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_slug)
);

create table public.saved_outfits (
  user_id uuid not null references auth.users (id) on delete cascade,
  outfit_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, outfit_slug)
);

create table public.saved_styles (
  user_id uuid not null references auth.users (id) on delete cascade,
  style_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, style_slug)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Quyền ở mức bảng
-- ────────────────────────────────────────────────────────────────────────────
--
-- Supabase cấp sẵn `all privileges` trên mọi bảng mới trong `public` cho
-- `anon`, `authenticated` và `service_role` (qua default privileges). `all`
-- ở đây gồm cả **TRUNCATE**, `REFERENCES` và `TRIGGER`.
--
-- `TRUNCATE` là chỗ chết người: **PostgreSQL không áp RLS cho TRUNCATE**. Nó
-- chỉ bị chặn bởi quyền ở mức bảng. Nghĩa là nếu `authenticated` còn giữ
-- `TRUNCATE`, bất kỳ người dùng nào đã đăng nhập cũng xoá sạch được
-- `closet_items` của **toàn bộ** người dùng khác, và hai mươi policy bên dưới
-- không chặn được một dòng nào của việc đó.
--
-- Vì vậy phải `revoke all` **trước**, rồi mới `grant` lại đúng phần cần. Chỉ
-- `grant` thêm thì không thu hồi được gì: quyền là cộng dồn, không phải thay
-- thế. Đây là lỗi đã từng có mặt trong chính file này.
--
--  * `anon` (khách chưa đăng nhập) không còn quyền nào. Năm bảng này không có
--    gì công khai, và trang công khai (`/`, `/wardrobe/*`, `/styles/*`) đọc
--    fixtures chứ không đọc database.
--  * `authenticated` chỉ còn đúng bốn thao tác, và RLS mới là thứ quyết định
--    *hàng nào*. Bốn thao tác này khớp bốn policy mỗi bảng — không tạo policy
--    cho một thao tác mà role không có quyền, vì một policy không bao giờ
--    được đánh giá chỉ làm người đọc tin sai về vùng bảo vệ.
--  * `public` (pseudo-role mà mọi role đều kế thừa) cũng bị thu hồi, để không
--    còn đường vòng nào.
--  * `service_role` giữ nguyên quyền mặc định và vốn bỏ qua RLS; nó chỉ được
--    dùng ở server cho việc xoá tài khoản (Task 13).

revoke all on table
  public.profiles,
  public.closet_items,
  public.saved_items,
  public.saved_outfits,
  public.saved_styles
from public, anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.closet_items to authenticated;
grant select, insert, update, delete on table public.saved_items to authenticated;
grant select, insert, update, delete on table public.saved_outfits to authenticated;
grant select, insert, update, delete on table public.saved_styles to authenticated;

-- Khẳng định lại kết quả thay vì tin rằng mình vừa viết đúng. `TRUNCATE`
-- không thể kiểm được từ test tích hợp (supabase-js không có đường chạy SQL
-- thô, và PostgREST không phơi `information_schema`), nên chỗ duy nhất kiểm
-- được là ngay đây, lúc áp migration. Sai thì migration dừng, không âm thầm
-- để lại một bảng ai cũng truncate được.
do $$
declare
  tbl text;
  rol text;
  priv text;
begin
  foreach tbl in array array[
    'profiles', 'closet_items', 'saved_items', 'saved_outfits', 'saved_styles'
  ] loop
    foreach rol in array array['anon', 'authenticated'] loop
      foreach priv in array array['TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(rol::name, format('public.%I', tbl), priv) then
          raise exception
            'Role % vẫn còn quyền % trên public.% — RLS không áp cho TRUNCATE, phải revoke trước khi grant',
            rol, priv, tbl;
        end if;
      end loop;
    end loop;

    if has_table_privilege('anon'::name, format('public.%I', tbl), 'SELECT') then
      raise exception 'Role anon vẫn đọc được public.% — bảng này không có gì công khai', tbl;
    end if;

    if not has_table_privilege('authenticated'::name, format('public.%I', tbl), 'SELECT') then
      raise exception 'Role authenticated mất quyền SELECT trên public.% — app sẽ không đọc được gì', tbl;
    end if;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
--
-- Mẫu chung của mọi policy dưới đây:
--   * `to authenticated` — khách chưa đăng nhập không có policy nào khớp, nên
--     không thấy hàng nào. Không bao giờ dùng `to public` ở đây.
--   * `select`/`delete`: chỉ `using` (không có hàng mới nào được tạo ra).
--   * `insert`: chỉ `with check` (chưa có hàng cũ nào để `using` xét).
--   * `update`: **cả hai**, cùng một điều kiện — `using` chặn nhắm vào hàng
--     của người khác, `with check` chặn biến hàng của mình thành hàng của
--     người khác.
--   * `(select auth.uid())` chứ không phải `auth.uid()` trần: bọc trong
--     subquery để planner tính một lần cho cả câu lệnh thay vì mỗi hàng. Giá
--     trị hoàn toàn như nhau.

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

alter table public.closet_items enable row level security;

create policy "closet_items_select_own" on public.closet_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "closet_items_insert_own" on public.closet_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "closet_items_update_own" on public.closet_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "closet_items_delete_own" on public.closet_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.saved_items enable row level security;

create policy "saved_items_select_own" on public.saved_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_items_insert_own" on public.saved_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "saved_items_update_own" on public.saved_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "saved_items_delete_own" on public.saved_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.saved_outfits enable row level security;

create policy "saved_outfits_select_own" on public.saved_outfits
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_outfits_insert_own" on public.saved_outfits
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "saved_outfits_update_own" on public.saved_outfits
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "saved_outfits_delete_own" on public.saved_outfits
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.saved_styles enable row level security;

create policy "saved_styles_select_own" on public.saved_styles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_styles_insert_own" on public.saved_styles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "saved_styles_update_own" on public.saved_styles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "saved_styles_delete_own" on public.saved_styles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Bucket `closet` + policy storage
-- ────────────────────────────────────────────────────────────────────────────

-- `public = false`: không có URL công khai nào, kể cả khi đoán đúng tên file.
-- Ảnh ra tới client chỉ bằng signed URL hạn ngắn sinh ở server (spec §6.3).
--
-- `on conflict … do update` chứ không phải `do nothing`: nếu bucket `closet`
-- đã tồn tại (ai đó tạo tay trên dashboard, rất có thể là **public**), thì
-- `do nothing` sẽ để nguyên một bucket công khai và migration vẫn báo thành
-- công. Dòng này hội tụ về trạng thái đúng thay vì bỏ qua.
--
-- `file_size_limit`/`allowed_mime_types` không phải trang trí: ảnh đi **thẳng**
-- từ trình duyệt lên bucket (spec §6.4), nên kiểm tra phía client là lời
-- khuyên, còn đây là chỗ duy nhất thật sự chặn được một file 500MB hay một
-- file .exe đổi tên. Hai giá trị này phải khớp `MAX_PHOTO_BYTES` và
-- `ALLOWED_PHOTO_TYPES` trong `src/features/stylist/photo-limits.ts` — nguồn
-- khai báo vẫn là file TypeScript đó; đây là bản sao *thi hành*, sửa bên kia
-- thì phải sửa cả đây.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'closet',
  'closet',
  false,
  4000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bốn policy dưới đây chỉ có nghĩa nếu `storage.objects` **đang bật** RLS.
-- Bảng đó không thuộc migration này (Supabase bật sẵn), nên ở đây không
-- `alter table` — lệnh đó cần `supabase_storage_admin` và có thể không chạy
-- được. Nhưng đọc trạng thái thì không cần quyền gì, và nếu RLS đang tắt
-- (ai đó tắt đi để debug, hoặc mặc định của Supabase đổi) thì bốn policy
-- thành vật trang trí: cờ `public = false` vẫn chặn URL công khai, nhưng
-- **mọi người dùng đã đăng nhập đọc và ghi được mọi object trong `closet`**.
-- Đúng cái bẫy đoạn đầu file cảnh báo, chỉ là ở một bảng mình không sở hữu.
-- Thà migration dừng ở đây còn hơn báo thành công rồi để ảnh mở toang.
do $$
begin
  if not (
    select relrowsecurity from pg_class where oid = 'storage.objects'::regclass
  ) then
    raise exception
      'RLS đang tắt trên storage.objects — bốn policy của bucket closet sẽ không có tác dụng. Bật lại (Storage → Policies) rồi chạy lại migration.';
  end if;
end $$;

-- Đường dẫn ảnh là `<user_id>/<file>`, và `storage.foldername(name)` trả về
-- mảng các segment thư mục, nên `[1]` là segment đầu. So khớp nó với
-- `auth.uid()::text` là toàn bộ cơ chế phân chủ sở hữu trong bucket này —
-- cùng một bất biến mà constraint `closet_items_image_path_in_own_folder` ép
-- ở phía bảng.
--
-- `bucket_id = 'closet'` trong mọi policy là bắt buộc: `storage.objects` là
-- **một bảng dùng chung cho mọi bucket**. Thiếu điều kiện này thì policy ở
-- đây cũng cấp quyền trên các bucket khác của project.
--
-- `select` phủ cả `download`, `list` và `createSignedUrl` — ký một URL cũng
-- đòi quyền đọc chính object đó, nên không có đường vòng qua signed URL.

create policy "closet_objects_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'closet'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "closet_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'closet'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- `update` cần cả hai mệnh đề: `using` để không ghi đè lên file của người
-- khác, `with check` để không đổi tên một file của mình thành đường dẫn nằm
-- trong thư mục của người khác (upsert và move/copy của Storage đều đi qua
-- update).
create policy "closet_objects_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'closet'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'closet'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "closet_objects_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'closet'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
