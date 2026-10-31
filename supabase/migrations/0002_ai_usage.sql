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
-- Hai điểm an ninh giống hệt `0001`, áp lại ở quy mô một bảng:
--  1. `enable row level security` — thiếu dòng này thì bảng mở toang cho
--     mọi người dùng đã đăng nhập.
--  2. `revoke all` **trước khi** `grant` lại đúng ba quyền cần (select,
--     insert, update — không có delete, không tính năng nào xoá hàng hạn
--     mức) — quyền là cộng dồn, không phải thay thế, nên thứ tự là toàn bộ
--     vấn đề. Không có `TRUNCATE`/`REFERENCES`/`TRIGGER` nào được giữ lại
--     cho `anon`/`authenticated`.

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

-- Tự khẳng định lại, giống `0001`: chỗ duy nhất kiểm được `TRUNCATE` là ngay
-- lúc áp migration (PostgREST không phơi `information_schema`/`pg_catalog`
-- để một test tích hợp kiểm lại). Sai thì dừng migration, không âm thầm để
-- lại một bảng ai đã đăng nhập cũng xoá/đọc được của người khác.
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
end $$;

alter table public.ai_usage enable row level security;

-- Cùng khuôn với RLS của `0001`: `to authenticated` (khách chưa đăng nhập
-- không khớp policy nào), `(select auth.uid())` bọc trong subquery để
-- planner tính một lần cho cả câu lệnh, `insert`/`update` có `with check`
-- để không ai ghi/sửa được hàng đứng tên người khác.

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
