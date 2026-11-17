// Hàng rào cho một bất biến mà không test hành vi nào bắt được, và `pnpm
// build` cũng không: **đường client phải tham chiếu từng biến
// `NEXT_PUBLIC_*` dưới dạng biểu thức tĩnh `process.env.TÊN_BIẾN`.**
//
// Vì sao phải ghim bằng văn bản chứ không bằng hành vi: Next/Turbopack chỉ
// thay giá trị vào bundle khi nó *nhìn thấy* `process.env.NEXT_PUBLIC_FOO`
// viết nguyên dạng trong source. Truyền `process.env` qua một tham số rồi
// đọc thuộc tính động (`source.NEXT_PUBLIC_FOO`) thì bundler không có gì
// để thay — code vẫn hợp lệ, build vẫn xanh, test vẫn xanh vì test luôn
// truyền object tường minh. Chỉ trình duyệt mới biết: `process.env` ở
// client gần như rỗng, nên `getSupabaseEnv()` trả `null` và nút đăng nhập
// im lặng không làm gì.
//
// Đó là lỗi đã xảy ra thật. Nó sống qua 14 vòng review vì mọi lớp kiểm tra
// đều ở phía Node, nơi `process.env` là thật.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ENV_PATH = join(process.cwd(), 'src/lib/supabase/env.ts')
const sql = readFileSync(ENV_PATH, 'utf8')

const PUBLIC_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']

describe('src/lib/supabase/env.ts — nhúng biến ở client', () => {
  for (const name of PUBLIC_VARS) {
    it(`tham chiếu ${name} dưới dạng process.env.${name} để bundler thay được`, () => {
      expect(sql).toContain(`process.env.${name}`)
    })
  }

  it('không dựa vào việc đọc cả object process.env làm mặc định', () => {
    // `= process.env` đứng một mình nghĩa là bundler không thấy biến nào
    // để nhúng. Phải là một object dựng từ các tham chiếu tĩnh ở trên.
    expect(sql).not.toMatch(/=\s*process\.env\s*[,)]/)
  })
})
