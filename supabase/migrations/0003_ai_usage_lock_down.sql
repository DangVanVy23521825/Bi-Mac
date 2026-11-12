-- 0003_ai_usage_lock_down.sql
--
-- Khoá hạn mức gắn nhãn AI lại cho đúng: trước file này, **chính người bị
-- giới hạn tự reset được giới hạn của mình**.
--
-- Lỗ hổng cụ thể mà migration này đóng. `0002_ai_usage.sql` cấp `insert,
-- update` trên `public.ai_usage` cho `authenticated`, vì
-- `increment_ai_usage` ở đó là `security invoker` nên nó cần đúng những
-- quyền ấy *của người gọi* để tăng được bộ đếm. Nhưng PostgREST phơi cả
-- schema `public`, và anon key là `NEXT_PUBLIC_` — nằm sẵn trong bundle
-- trình duyệt. Một người đã đăng nhập, cầm token phiên của chính mình, chỉ
-- cần gọi `PATCH /rest/v1/ai_usage?user_id=eq.<chính mình>` với
-- `{"count": 0}`: policy `ai_usage_update_own` cho qua ở cả `using` lẫn
-- `with check` (hàng đó đúng là của họ), rồi họ gọi lại `/api/closet/tag`
-- từ đầu. Route đó không có giới hạn theo IP, không có giới hạn toàn hệ
-- thống — chỉ có đúng bộ đếm này (`src/features/closet/quota.ts`) — nên
-- hậu quả thực tế là chi phí gọi Gemini vision không còn trần cho bất kỳ
-- ai đăng nhập được bằng Google. Spec §6.5 đòi hạn mức này đúng vì "nó tốn
-- tiền", và §9 ghi chi phí gắn nhãn là một rủi ro: một hạn mức mà bên bị
-- hạn tự xoá được thì không phải hạn mức.
--
-- Cách đóng, và vì sao từng mảnh đều cần:
--  1. `increment_ai_usage` chuyển sang `security definer`. Hàm giờ chạy
--     bằng quyền của owner (role áp migration), nên nó vẫn ghi được
--     `ai_usage` *sau khi* `authenticated` mất quyền ghi trực tiếp — đó
--     chính là điều cho phép bước 3.
--  2. Dòng đầu tiên trong thân hàm so `p_user_id` với `auth.uid()` và
--     `raise exception` nếu lệch. Ở `0002`, thứ chặn một lệnh gọi mạo danh
--     là `with check` của policy — nhưng `security definer` bỏ qua RLS,
--     nên nếu thiếu dòng này thì A gọi được `increment_ai_usage(B, hôm
--     nay)` và đốt hạn mức của B. Nói thẳng: kiểm tra này không phải thắt
--     dây an toàn cho vui, nó là thứ *thay thế* lớp bảo vệ mà
--     `security definer` vừa tháo ra.
--  3. `revoke insert, update on public.ai_usage from authenticated`. Giữ
--     lại đúng `select` (người dùng vẫn phải xem được hạn mức của chính
--     mình) và `execute` trên hàm. Hết đường `PATCH count = 0`: con đường
--     duy nhất còn lại để sửa bảng này là gọi hàm, và hàm chỉ biết tăng
--     thêm một, cho đúng một người — chính người gọi.
--
-- File mới, không sửa `0002`: `0002` có thể đã được áp lên một project
-- thật, và sửa một migration đã áp thì lịch sử không còn tái lập được —
-- cùng đúng lý do đã đẩy `ai_usage` ra khỏi `0001` thay vì sửa `0001`.
-- Mọi câu lệnh dưới đây an toàn khi chạy trên database **đã** có `0002`:
-- `create or replace` cho hàm, `revoke` cho quyền, và một khối
-- `do $$ … $$` khẳng định lại trạng thái cuối.
--
-- Một hệ quả cần nói rõ cho người sau: từ đây `increment_ai_usage` chỉ gọi
-- được từ một phiên đăng nhập thật. Gọi bằng `service_role` (hoặc bất cứ
-- ngữ cảnh nào `auth.uid()` là null) sẽ `raise exception` — đúng ý muốn,
-- vì không tính năng nào trong `src/` cần tăng hạn mức thay người khác
-- (`src/features/account/delete.ts` xoá hàng `ai_usage` qua
-- `on delete cascade`, không qua hàm này). Một việc quản trị tương lai cần
-- ghi vào bảng này nên dùng service_role ghi thẳng vào bảng, chứ không
-- nới lại kiểm tra ở đây.

create or replace function public.increment_ai_usage(p_user_id uuid, p_day date)
returns integer
language plpgsql
security definer
-- `set search_path = ''` cùng lý do như ở `0002` và như
-- `set_updated_at()`/`handle_new_user()` ở `0001` — và với
-- `security definer` thì nó còn quan trọng hơn một bậc: hàm chạy bằng
-- quyền owner, nên một schema lạ chen vào phân giải tên bên trong hàm sẽ
-- được thi hành với quyền đó. Mọi tên bên dưới vì vậy đều phải đủ schema
-- (`public.ai_usage`, `auth.uid`).
set search_path = ''
as $$
declare
  new_count integer;
begin
  -- Xem mục 2 ở đầu file: `security definer` bỏ qua RLS, nên đây là lớp
  -- duy nhất còn lại chặn việc tăng hạn mức của người khác. Đừng bỏ.
  if p_user_id is distinct from (select auth.uid()) then
    raise exception 'increment_ai_usage chỉ tăng được hạn mức của chính người gọi';
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  returning count into new_count;

  return new_count;
end;
$$;

-- `create or replace` giữ nguyên ACL cũ của hàm, nhưng lặp lại cặp
-- revoke-rồi-grant để file này một mình cũng đủ mô tả trạng thái cuối —
-- cùng kỷ luật "revoke trước, grant sau" của `0001`/`0002`, vì quyền là
-- cộng dồn chứ không phải thay thế.
revoke all on function public.increment_ai_usage(uuid, date) from public;

grant execute on function public.increment_ai_usage(uuid, date) to authenticated;

-- Thu hồi đúng hai quyền đã mở ở `0002`. `select` KHÔNG nằm trong danh
-- sách này: người dùng vẫn phải đọc được hàng hạn mức của chính mình.
revoke insert, update on table public.ai_usage from public, anon, authenticated;

-- Tự khẳng định lại trạng thái cuối, cùng lý do như hai migration trước:
-- PostgREST không phơi `information_schema`/`pg_catalog` nên không test
-- tích hợp nào kiểm được quyền ở mức bảng/hàm; chỗ duy nhất kiểm được là
-- ngay lúc áp migration. Sai thì dừng, không âm thầm để lại một hạn mức mà
-- người bị hạn tự reset được.
-- (`src/lib/supabase/migration-guards.test.ts` là lớp thứ hai cho đúng các
-- bất biến này, vì khối `do $$` dưới đây chỉ chạy một lần, trên máy người
-- áp migration, không bao giờ chạy lại trong CI.)
do $$
declare
  rol text;
  priv text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    -- `INSERT`/`UPDATE` giờ nằm cùng nhóm với `TRUNCATE`/`DELETE`: không
    -- role nào của client được ghi thẳng vào bảng này nữa, mọi lượt ghi
    -- phải đi qua `increment_ai_usage`.
    foreach priv in array array['INSERT', 'UPDATE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'DELETE'] loop
      if has_table_privilege(rol::name, 'public.ai_usage', priv) then
        raise exception
          'Role % vẫn còn quyền % trên public.ai_usage — hạn mức sẽ tự reset được',
          rol, priv;
      end if;
    end loop;
  end loop;

  if not has_table_privilege('authenticated'::name, 'public.ai_usage', 'SELECT') then
    raise exception 'Role authenticated mất quyền SELECT trên public.ai_usage — app sẽ không đọc được hạn mức của chính mình';
  end if;

  if has_table_privilege('anon'::name, 'public.ai_usage', 'SELECT') then
    raise exception 'Role anon vẫn đọc được public.ai_usage — bảng này không có gì công khai';
  end if;

  if not has_function_privilege('authenticated'::name, 'public.increment_ai_usage(uuid, date)', 'EXECUTE') then
    raise exception 'Role authenticated mất quyền EXECUTE trên public.increment_ai_usage — route gắn nhãn sẽ không tăng được hạn mức';
  end if;

  if has_function_privilege('anon'::name, 'public.increment_ai_usage(uuid, date)', 'EXECUTE') then
    raise exception 'Role anon gọi được public.increment_ai_usage — khách chưa đăng nhập không được tăng hạn mức của ai cả';
  end if;

  -- Thiếu `security definer` thì `revoke insert, update` ở trên biến hàm
  -- thành hỏng hoàn toàn (hàm chạy bằng quyền người gọi, mà người gọi vừa
  -- mất quyền ghi) — route gắn nhãn sẽ fail-closed với mọi người dùng.
  -- Khẳng định ở đây để hai nửa của fix không bao giờ đi lẻ.
  if not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'increment_ai_usage'
      and p.pronargs = 2
  ) then
    raise exception 'public.increment_ai_usage không còn là security definer — nó sẽ không ghi được sau khi authenticated mất quyền ghi';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.ai_usage'::regclass) then
    raise exception 'RLS đã tắt trên public.ai_usage — ba policy của bảng này thành vật trang trí';
  end if;
end $$;
