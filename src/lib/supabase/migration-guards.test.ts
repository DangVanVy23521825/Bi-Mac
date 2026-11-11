// Bốn bất biến an ninh trong `supabase/migrations/0001_account_and_closet.sql`
// mà **không** test nào khác bắt được, và lý do chúng phải nằm ở đây:
//
//  * `TRUNCATE` không chịu RLS — nó chỉ bị chặn bởi quyền ở mức bảng. Supabase
//    cấp sẵn `all privileges` (gồm TRUNCATE) cho `authenticated` trên bảng mới
//    trong `public`, nên nếu `revoke all` biến mất thì mọi người dùng đã đăng
//    nhập xoá sạch được bảng của **tất cả** người dùng khác, và hai mươi policy
//    không chặn được gì.
//  * Không có đường nào kiểm việc đó từ `rls.integration.test.ts`: supabase-js
//    không chạy SQL thô, và PostgREST không phơi `information_schema` hay
//    `pg_catalog`. Migration có hai khối `do $$ … $$` tự khẳng định lúc áp —
//    nhưng chúng chỉ chạy **một lần**, trên máy của người áp migration, và
//    không bao giờ chạy lại trong CI.
//
// Vì vậy test này kiểm **hình dạng của file SQL**, không kiểm database. Nói
// thẳng để không ai đọc nhầm: nó đậu KHÔNG có nghĩa là database an toàn — nó
// chỉ có nghĩa là mấy dòng phòng vệ chưa bị ai xoá. Bằng chứng về database vẫn
// là `rls.integration.test.ts` chạy với credentials thật.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const MIGRATION_PATH = 'supabase/migrations/0001_account_and_closet.sql'
const sql = readFileSync(MIGRATION_PATH, 'utf8')

const TABLES = ['profiles', 'closet_items', 'saved_items', 'saved_outfits', 'saved_styles']

describe(MIGRATION_PATH, () => {
  it('thu hồi sạch quyền của authenticated trước khi grant lại', () => {
    const revokeAt = sql.indexOf('revoke all on table')
    const grantAt = sql.indexOf('to authenticated;')

    expect(revokeAt).toBeGreaterThan(-1)
    expect(grantAt).toBeGreaterThan(-1)
    // Thứ tự là toàn bộ vấn đề: quyền là cộng dồn, không phải thay thế, nên
    // chỉ `grant` mà không `revoke` trước thì TRUNCATE vẫn còn nguyên đó.
    expect(revokeAt).toBeLessThan(grantAt)

    const revokeStatement = sql.slice(revokeAt, sql.indexOf(';', revokeAt))
    for (const table of TABLES) {
      expect(revokeStatement).toContain(`public.${table}`)
    }
    for (const role of ['public', 'anon', 'authenticated']) {
      expect(revokeStatement).toContain(role)
    }
  })

  it('tự khẳng định authenticated không còn TRUNCATE lúc áp migration', () => {
    expect(sql).toContain('has_table_privilege')
    expect(sql).toContain("'TRUNCATE'")
  })

  it('tự khẳng định RLS đang bật trên storage.objects lúc áp migration', () => {
    // Bốn policy của bucket `closet` là vật trang trí nếu RLS tắt ở bảng này,
    // và `storage.objects` không thuộc migration này nên không thể tự bật.
    expect(sql).toContain('relrowsecurity')
    expect(sql).toContain("'storage.objects'::regclass")
  })

  it('bật RLS trên cả năm bảng thuộc migration này', () => {
    for (const table of TABLES) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
    }
  })
})

// `0002_ai_usage.sql` (Task 6) mang đúng loại rủi ro mà file test này tồn
// tại để bắt — `revoke`/`grant` cộng dồn không phải thay thế, và không có
// đường nào kiểm TRUNCATE/EXECUTE từ `rls.integration.test.ts` (PostgREST
// không phơi `information_schema`/`pg_catalog`). Khối `do $$ … $$` tự
// khẳng định trong file đó chỉ chạy một lần, lúc ai đó áp migration lên một
// project thật — không chạy lại trong CI. Một guard riêng ở đây, tách
// khỏi `describe` của `0001` phía trên vì hình dạng khác (một bảng, không
// có storage.objects, có thêm một hàm `increment_ai_usage` với quyền
// EXECUTE của chính nó cần soi riêng), là lớp CI-enforced thứ hai cho đúng
// các bất biến đó.
const MIGRATION_PATH_0002 = 'supabase/migrations/0002_ai_usage.sql'
const sql0002 = readFileSync(MIGRATION_PATH_0002, 'utf8')

describe(MIGRATION_PATH_0002, () => {
  it('thu hồi sạch quyền của ai_usage trước khi grant lại', () => {
    const revokeAt = sql0002.indexOf('revoke all on table')
    const grantAt = sql0002.indexOf('to authenticated;')

    expect(revokeAt).toBeGreaterThan(-1)
    expect(grantAt).toBeGreaterThan(-1)
    expect(revokeAt).toBeLessThan(grantAt)

    const revokeStatement = sql0002.slice(revokeAt, sql0002.indexOf(';', revokeAt))
    expect(revokeStatement).toContain('public.ai_usage')
    for (const role of ['public', 'anon', 'authenticated']) {
      expect(revokeStatement).toContain(role)
    }
  })

  it('tự khẳng định anon/authenticated không còn TRUNCATE/REFERENCES/TRIGGER/DELETE trên ai_usage lúc áp migration', () => {
    expect(sql0002).toContain('has_table_privilege')
    for (const priv of ['TRUNCATE', 'REFERENCES', 'TRIGGER', 'DELETE']) {
      expect(sql0002).toContain(`'${priv}'`)
    }
  })

  it('bật RLS trên ai_usage', () => {
    expect(sql0002).toContain('alter table public.ai_usage enable row level security;')
  })

  it('thu hồi EXECUTE của increment_ai_usage từ public trước khi grant lại cho authenticated', () => {
    const revokeAt = sql0002.indexOf('revoke all on function')
    const grantAt = sql0002.indexOf('grant execute on function')

    expect(revokeAt).toBeGreaterThan(-1)
    expect(grantAt).toBeGreaterThan(-1)
    expect(revokeAt).toBeLessThan(grantAt)
    expect(sql0002.slice(revokeAt, sql0002.indexOf(';', revokeAt))).toContain(
      'public.increment_ai_usage',
    )
  })

  it('tự khẳng định anon không gọi được increment_ai_usage, authenticated vẫn gọi được, lúc áp migration', () => {
    expect(sql0002).toContain('has_function_privilege')
    expect(sql0002).toContain("'public.increment_ai_usage(uuid, date)'")
    expect(sql0002).toContain("'EXECUTE'")
  })
})

// `0003_ai_usage_lock_down.sql` đóng lỗ hổng mà review toàn-nhánh tìm ra:
// `0002` cấp `insert, update` trên `ai_usage` cho `authenticated` (vì hàm
// tăng bộ đếm ở đó là `security invoker`), nên một người dùng tự `PATCH
// count = 0` được bằng chính anon key công khai rồi gọi lại route gắn nhãn
// — một hạn mức tốn-tiền mà bên bị hạn tự reset được thì không phải hạn mức.
//
// Ba mảnh của fix chỉ có tác dụng khi đi cùng nhau, và đó là lý do nhóm
// guard này tồn tại thay vì chỉ trông vào khối `do $$` trong file SQL (nó
// chạy một lần, lúc ai đó áp migration, không bao giờ chạy lại trong CI):
//  * bỏ `security definer` → hàm hết ghi được, fail-closed cho mọi người;
//  * bỏ dòng so `p_user_id` với `auth.uid()` → A đốt được hạn mức của B,
//    vì `security definer` đã bỏ qua RLS nên `with check` không còn chặn;
//  * bỏ `revoke insert, update` → lỗ hổng gốc mở lại y như cũ.
const MIGRATION_PATH_0003 = 'supabase/migrations/0003_ai_usage_lock_down.sql'
const sql0003 = readFileSync(MIGRATION_PATH_0003, 'utf8')

describe(MIGRATION_PATH_0003, () => {
  it('thu hồi INSERT và UPDATE trên ai_usage khỏi authenticated, nhưng giữ SELECT', () => {
    const revokeAt = sql0003.indexOf('revoke insert, update on table public.ai_usage')
    expect(revokeAt).toBeGreaterThan(-1)

    const revokeStatement = sql0003.slice(revokeAt, sql0003.indexOf(';', revokeAt))
    expect(revokeStatement).toContain('authenticated')
    // `select` không được lọt vào câu revoke: người dùng vẫn phải xem được
    // hạn mức của chính mình (policy `ai_usage_select_own` ở `0002`).
    expect(revokeStatement.toLowerCase()).not.toContain('select')

    // Và migration này không được cấp lại thứ nó vừa thu hồi.
    expect(sql0003).not.toMatch(/grant[^;]*(insert|update)[^;]*on table public\.ai_usage/i)
  })

  it('increment_ai_usage chuyển sang security definer', () => {
    // Nửa thứ nhất của fix: thiếu dòng này thì hàm chạy bằng quyền người
    // gọi, mà người gọi vừa mất quyền ghi — route gắn nhãn chết hẳn.
    //
    // Cắt đúng phần khai báo (từ `create or replace` tới `as $$`) rồi mới
    // tìm trong đó, không `toContain` trên cả file: cụm "security definer"
    // xuất hiện cả trong comment giải thích ở đầu file, nên một assertion
    // trên toàn văn bản vẫn đậu sau khi ai đó xoá đúng cái clause thật.
    const signatureAt = sql0003.indexOf(
      'create or replace function public.increment_ai_usage(p_user_id uuid, p_day date)',
    )
    expect(signatureAt).toBeGreaterThan(-1)

    const declaration = sql0003
      .slice(signatureAt, sql0003.indexOf('as $$', signatureAt))
      // Bỏ cả comment bên trong phần khai báo nữa, cùng lý do: comment ở
      // đó cũng nhắc tên clause, và một guard khớp vào comment là guard
      // không bắt được gì.
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')

    expect(declaration).toContain('security definer')
    expect(declaration).toContain("set search_path = ''")
  })

  it('hàm tự chặn p_user_id khác auth.uid() TRƯỚC khi ghi bộ đếm', () => {
    // Nửa thứ hai, và là nửa dễ bị bỏ quên nhất: `security definer` bỏ qua
    // RLS, nên `with check` của `ai_usage_insert_own`/`ai_usage_update_own`
    // không còn chặn một lệnh gọi mạo danh. Kiểm cả thứ tự — kiểm tra phải
    // đứng trước câu `insert`, không phải sau khi bộ đếm đã tăng.
    const checkAt = sql0003.indexOf('if p_user_id is distinct from (select auth.uid()) then')
    const raiseAt = sql0003.indexOf('raise exception', checkAt)
    const insertAt = sql0003.indexOf('insert into public.ai_usage')

    expect(checkAt).toBeGreaterThan(-1)
    expect(raiseAt).toBeGreaterThan(checkAt)
    expect(insertAt).toBeGreaterThan(raiseAt)
  })

  it('tự khẳng định authenticated không còn INSERT/UPDATE lúc áp migration', () => {
    expect(sql0003).toContain('has_table_privilege')
    for (const priv of ['INSERT', 'UPDATE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'DELETE']) {
      expect(sql0003).toContain(`'${priv}'`)
    }
    // Khẳng định luôn rằng hàm vẫn là definer — hai nửa của fix không được
    // phép đi lẻ trên một database thật.
    expect(sql0003).toContain('prosecdef')
  })

  it('giữ nguyên EXECUTE cho authenticated, không mở cho anon', () => {
    const revokeAt = sql0003.indexOf('revoke all on function')
    const grantAt = sql0003.indexOf('grant execute on function')

    expect(revokeAt).toBeGreaterThan(-1)
    expect(grantAt).toBeGreaterThan(revokeAt)
    expect(sql0003).toContain("'public.increment_ai_usage(uuid, date)'")
    expect(sql0003).toContain('has_function_privilege')
  })
})
