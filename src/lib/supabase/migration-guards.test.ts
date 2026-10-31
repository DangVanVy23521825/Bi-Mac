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
