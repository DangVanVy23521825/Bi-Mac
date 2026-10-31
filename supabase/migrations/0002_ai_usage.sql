-- 0002_ai_usage.sql
--
-- Hạn mức gọi AI gắn nhãn tủ đồ, theo người dùng, theo ngày (Task 6). Bảng
-- mới, không sửa `0001_account_and_closet.sql` — migration đó có thể đã
-- được áp vào một project thật, và sửa một migration đã áp làm nó không
-- còn tái lập được (Ruling 1 của task).
--
-- Vì sao cần bảng, không dùng bộ đếm trong RAM
-- (`src/lib/rate-limit/memory.ts`): bộ đếm đó sống và chết theo một
-- instance — trên nền tảng nhiều instance, mỗi instance có bộ đếm riêng nên
-- hạn mức thật là `limit × số instance`, và bộ đếm mất sạch mỗi lần redeploy.
-- Hạn mức theo-người-dùng phải sống qua cả hai, nên phải nằm trong Postgres.
--
-- `(user_id, day)` là khoá chính — không cần cột `id` riêng, và khoá chính
-- đã tự mang tính unique mà task yêu cầu. `day` là `date` (không phải
-- `timestamptz`): một hàng cho mỗi (người dùng, ngày UTC), `count` tăng dần
-- trong ngày đó. `src/features/closet/quota.ts` tính "hôm nay" theo UTC
-- (`Date#toISOString().slice(0, 10)`), nên hạn mức reset vào nửa đêm UTC —
-- không phải nửa đêm theo giờ của từng người dùng — đổi lại là một mốc reset
-- duy nhất, không mơ hồ, không cần biết timezone của ai.
--
-- Ba điểm an ninh giống hệt `0001`, áp lại ở quy mô một bảng + một hàm:
--  1. `enable row level security` — thiếu dòng này thì bảng mở toang cho
--     mọi người dùng đã đăng nhập.
--  2. `revoke all` **trước khi** `grant` lại đúng ba quyền cần (select,
--     insert, update — không có delete, không tính năng nào xoá hàng hạn
--     mức) — quyền là cộng dồn, không phải thay thế, nên thứ tự là toàn bộ
--     vấn đề. Không có `TRUNCATE`/`REFERENCES`/`TRIGGER` nào được giữ lại
--     cho `anon`/`authenticated`.
--  3. Hàm `increment_ai_usage` bị thu hồi EXECUTE từ `public` ngay sau khi
--     tạo (Postgres mặc định cấp EXECUTE cho PUBLIC trên hàm mới), rồi cấp
--     lại đúng cho `authenticated` — cùng kỷ luật "revoke trước, grant sau"
--     như bảng.
--
-- Vì sao có hàm `increment_ai_usage` thay vì app tự làm "đọc rồi ghi"
-- (select count, rồi upsert count + 1 ở tầng TypeScript): hai lượt gọi riêng
-- biệt có một khoảng hở giữa đọc và ghi — N request đồng thời của cùng một
-- người dùng có thể cùng đọc được `count` cũ trước khi bất kỳ lượt ghi nào
-- diễn ra, nên cả N đều qua được kiểm tra hạn mức dù hạn mức chỉ còn đúng 1
-- chỗ. Gộp đọc-và-tăng thành một câu lệnh `insert … on conflict … do update
-- set count = count + 1 returning count` khiến nó an toàn dưới tải đồng
-- thời: một `UPDATE`/`UPSERT` trên một dòng được Postgres tự khoá dòng đó
-- cho tới khi transaction đó xong, nên các request đồng thời xếp hàng tuần
-- tự ở đúng một câu lệnh này, không có khoảng hở nào để chen vào giữa.
-- `src/lib/rate-limit/memory.ts` (bộ đếm trong RAM) đã né đúng loại race này
-- bằng cách không có `await` nào giữa lúc đọc và lúc ghi bộ đếm — hàm này áp
-- cùng nguyên tắc đó ở tầng database, nơi nó còn phải đúng trên nhiều
-- instance/connection, chứ không chỉ trong một process Node.
--
-- Quyết định cho qua/chặn được tính từ giá trị `count` SAU khi đã tăng (hàm
-- luôn tăng vô điều kiện, không tự biết hạn mức là bao nhiêu — hạn mức
-- `TAG_DAILY_LIMIT` sống ở TypeScript, `src/features/closet/quota.ts`, so
-- sánh sau khi gọi hàm). Nghĩa là `count` đếm số *lượt gọi được tính vào hạn
-- mức hôm nay*, không chỉ số lượt thật sự gọi được Gemini — cùng ngữ nghĩa
-- "đếm số lượt thử" mà `src/lib/rate-limit/memory.ts` đã dùng, không phải
-- "đếm số lượt thành công".
--
-- `security invoker` (mặc định, không viết `security definer`): hàm chạy
-- bằng quyền của người gọi, nên RLS của `ai_usage` vẫn áp dụng y như khi
-- client tự chạy insert/update — không cần mở khoá gì thêm, và một lệnh gọi
-- với `p_user_id` khác `auth.uid()` của chính người gọi sẽ bị `with check`
-- của policy insert/update chặn lại (tầng app vẫn luôn truyền đúng userId
-- của chính người dùng, nhưng hàm không *dựa* vào việc tầng app làm đúng).

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Hàm `set_updated_at()` đã tạo ở `0001`; Postgres không phân biệt hàm đó
-- "thuộc" migration nào, nên tái dùng ở đây là an toàn.
create trigger ai_usage_set_updated_at
  before update on public.ai_usage
  for each row execute function public.set_updated_at();

revoke all on table public.ai_usage from public, anon, authenticated;

grant select, insert, update on table public.ai_usage to authenticated;

-- Tăng-và-đọc atomic cho một (user_id, day). `set search_path = ''` cùng lý
-- do như `set_updated_at()`/`handle_new_user()` ở `0001`: hàm chạy trong
-- đường đi của dữ liệu người dùng, không để một schema lạ chen vào phân
-- giải tên bên trong hàm.
create or replace function public.increment_ai_usage(p_user_id uuid, p_day date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  returning count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_ai_usage(uuid, date) from public;

grant execute on function public.increment_ai_usage(uuid, date) to authenticated;

-- Tự khẳng định lại, giống `0001`: chỗ duy nhất kiểm được `TRUNCATE`/quyền
-- hàm là ngay lúc áp migration (PostgREST không phơi `information_schema`/
-- `pg_catalog` để một test tích hợp kiểm lại). Sai thì dừng migration,
-- không âm thầm để lại một bảng/hàm ai đã đăng nhập cũng xoá/đọc/gọi được
-- của người khác, hoặc một hàm ai chưa đăng nhập cũng gọi được.
do $$
declare
  rol text;
  priv text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    foreach priv in array array['TRUNCATE', 'REFERENCES', 'TRIGGER', 'DELETE'] loop
      if has_table_privilege(rol::name, 'public.ai_usage', priv) then
        raise exception
          'Role % vẫn còn quyền % trên public.ai_usage — phải revoke trước khi grant',
          rol, priv;
      end if;
    end loop;
  end loop;

  if has_table_privilege('anon'::name, 'public.ai_usage', 'SELECT') then
    raise exception 'Role anon vẫn đọc được public.ai_usage — bảng này không có gì công khai';
  end if;

  if not has_table_privilege('authenticated'::name, 'public.ai_usage', 'SELECT') then
    raise exception 'Role authenticated mất quyền SELECT trên public.ai_usage — app sẽ không đọc được hạn mức của chính mình';
  end if;

  if has_function_privilege('anon'::name, 'public.increment_ai_usage(uuid, date)', 'EXECUTE') then
    raise exception 'Role anon gọi được public.increment_ai_usage — khách chưa đăng nhập không được tăng hạn mức của ai cả';
  end if;

  if not has_function_privilege('authenticated'::name, 'public.increment_ai_usage(uuid, date)', 'EXECUTE') then
    raise exception 'Role authenticated mất quyền EXECUTE trên public.increment_ai_usage — route gắn nhãn sẽ không tăng được hạn mức';
  end if;
end $$;

alter table public.ai_usage enable row level security;

-- Cùng khuôn với RLS của `0001`: `to authenticated` (khách chưa đăng nhập
-- không khớp policy nào), `(select auth.uid())` bọc trong subquery để
-- planner tính một lần cho cả câu lệnh, `insert`/`update` có `with check`
-- để không ai ghi/sửa được hàng đứng tên người khác. `increment_ai_usage`
-- ở trên là `security invoker` nên các policy này áp dụng cho cả lượt
-- insert/update mà hàm thực hiện bên trong, không chỉ lượt gọi trực tiếp
-- từ client.

create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_usage_insert_own" on public.ai_usage
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ai_usage_update_own" on public.ai_usage
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
