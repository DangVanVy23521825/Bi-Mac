// Test cho `deleteAccount` — và thứ nó thật sự phải chứng minh là **thứ tự**,
// không phải "có gọi đủ hai bước hay không".
//
// Lý do: `on delete cascade` từ `auth.users` dọn sạch năm bảng (xem
// `supabase/migrations/0001_account_and_closet.sql`), nhưng Supabase Storage
// là một hệ thống riêng — cascade không chạm tới nó. Đường dẫn ảnh chỉ tồn
// tại ở hai nơi: hàng `closet_items` (bị cascade xoá) và chính bucket. Xoá
// user trước, rồi mới dọn bucket, là mất đường dẫn trước khi dùng tới: file
// ảnh riêng tư nằm lại vĩnh viễn và không còn ai biết đường mà tìm.
//
// Vì vậy mọi test ở đây ghi lại **chuỗi lời gọi** vào một mảng `calls` rồi
// so khớp nguyên chuỗi, thay vì chỉ `expect(remove).toHaveBeenCalled()`. Một
// assertion kiểu "cả hai đều được gọi" vẫn xanh khi thứ tự bị đảo — đúng cái
// bug nguy hiểm nhất mà file này phải bắt.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient }))

// Import sau mock: `admin.ts` có `import 'server-only'` và dựng client thật.
import { AccountDeletionError, CLOSET_LIST_PAGE_SIZE, deleteAccount } from './delete'

const USER = 'user-aaa'

type Entry = { name: string; id: string | null }

function file(name: string): Entry {
  return { name, id: `uuid-${name}` }
}

/** Thư mục con — Supabase đánh dấu bằng `id === null`. */
function folder(name: string): Entry {
  return { name, id: null }
}

type FakeOptions = {
  /** Kết quả `list` theo thứ tự gọi, khoá theo prefix. */
  listing?: Record<string, Entry[][]>
  listError?: { message: string } | null
  removeError?: { message: string } | null
  deleteUserError?: { message: string } | null
}

function fakeAdmin(options: FakeOptions = {}) {
  const calls: string[] = []
  const listing = options.listing ?? { [USER]: [[]] }

  const list = vi.fn(async (prefix: string, params: { limit: number; offset: number }) => {
    calls.push(`list:${prefix}@${params.offset}`)
    if (options.listError) return { data: null, error: options.listError }
    const pages = listing[prefix] ?? [[]]
    const page = pages.shift() ?? []
    return { data: page, error: null }
  })

  const remove = vi.fn(async (paths: string[]) => {
    calls.push(`remove:${paths.join('|')}`)
    return { data: null, error: options.removeError ?? null }
  })

  const deleteUser = vi.fn(async (id: string) => {
    calls.push(`deleteUser:${id}`)
    return { data: null, error: options.deleteUserError ?? null }
  })

  const from = vi.fn(() => ({ list, remove }))

  createSupabaseAdminClient.mockReturnValue({
    storage: { from },
    auth: { admin: { deleteUser } },
  })

  return { calls, list, remove, deleteUser, from }
}

async function reasonOf(run: Promise<unknown>): Promise<string> {
  try {
    await run
  } catch (error) {
    if (error instanceof AccountDeletionError) return error.reason
    return `không phải AccountDeletionError: ${String(error)}`
  }
  return 'không ném lỗi'
}

describe('deleteAccount', () => {
  beforeEach(() => {
    createSupabaseAdminClient.mockReset()
  })

  it('xoá file trong bucket trước khi xoá hàng database', async () => {
    const admin = fakeAdmin({ listing: { [USER]: [[file('ao.png'), file('vay.png')]] } })

    await deleteAccount(USER)

    // So khớp nguyên chuỗi: đảo hai bước cuối là test đỏ ngay.
    expect(admin.calls).toEqual([
      `list:${USER}@0`,
      `remove:${USER}/ao.png|${USER}/vay.png`,
      `deleteUser:${USER}`,
    ])
    expect(admin.from).toHaveBeenCalledWith('closet')
  })

  it('chỉ đụng tới thư mục mang đúng id của user', async () => {
    const admin = fakeAdmin({ listing: { [USER]: [[file('ao.png')]] } })

    await deleteAccount(USER)

    expect(admin.list).toHaveBeenCalledWith(USER, expect.anything())
    const removed = admin.remove.mock.calls.flatMap(([paths]) => paths)
    for (const path of removed) {
      expect(path.startsWith(`${USER}/`)).toBe(true)
    }
  })

  it('ném lỗi khi thiếu SUPABASE_SERVICE_ROLE_KEY', async () => {
    // `createSupabaseAdminClient` trả `null` khi thiếu env — cùng hợp đồng
    // "không ném, trả null" của `getSupabaseEnv`. Chỗ ném là ở đây.
    createSupabaseAdminClient.mockReturnValue(null)

    expect(await reasonOf(deleteAccount(USER))).toBe('missing-service-role')
  })

  it('liệt kê hết mọi trang trước khi xoá, không dừng ở trang đầu', async () => {
    const firstPage = Array.from({ length: CLOSET_LIST_PAGE_SIZE }, (_, i) => file(`a${i}.png`))
    const secondPage = [file('cuoi-cung.png')]
    const admin = fakeAdmin({ listing: { [USER]: [firstPage, secondPage] } })

    await deleteAccount(USER)

    expect(admin.list).toHaveBeenCalledTimes(2)
    expect(admin.calls[0]).toBe(`list:${USER}@0`)
    expect(admin.calls[1]).toBe(`list:${USER}@${CLOSET_LIST_PAGE_SIZE}`)

    const removed = admin.remove.mock.calls.flatMap(([paths]) => paths)
    expect(removed).toHaveLength(CLOSET_LIST_PAGE_SIZE + 1)
    expect(removed).toContain(`${USER}/cuoi-cung.png`)

    // Vẫn là bước cuối cùng, sau khi cả hai trang đã được dọn.
    expect(admin.calls.at(-1)).toBe(`deleteUser:${USER}`)
  })

  it('đi vào cả thư mục con trong thư mục của user', async () => {
    const admin = fakeAdmin({
      listing: {
        [USER]: [[file('ao.png'), folder('2026')]],
        [`${USER}/2026`]: [[file('vay-cu.png')]],
      },
    })

    await deleteAccount(USER)

    const removed = admin.remove.mock.calls.flatMap(([paths]) => paths)
    expect(removed).toContain(`${USER}/2026/vay-cu.png`)
    // Tên thư mục không bao giờ được gửi vào `remove` như một file.
    expect(removed).not.toContain(`${USER}/2026`)
  })

  it('không gọi remove khi tủ đồ rỗng, nhưng vẫn xoá tài khoản', async () => {
    const admin = fakeAdmin({ listing: { [USER]: [[]] } })

    await deleteAccount(USER)

    expect(admin.remove).not.toHaveBeenCalled()
    expect(admin.deleteUser).toHaveBeenCalledWith(USER)
  })

  it('giữ nguyên tài khoản khi xoá file thất bại', async () => {
    // Fail closed. Xoá user lúc này là huỷ nốt bản ghi duy nhất còn biết
    // đường dẫn tới những file chưa dọn được — ảnh riêng tư thành rác
    // vĩnh viễn, không ai tìm lại được. Còn tài khoản thì còn đường thử lại.
    const admin = fakeAdmin({
      listing: { [USER]: [[file('ao.png')]] },
      removeError: { message: 'storage down' },
    })

    expect(await reasonOf(deleteAccount(USER))).toBe('bucket-cleanup')
    expect(admin.deleteUser).not.toHaveBeenCalled()
  })

  it('giữ nguyên tài khoản khi không liệt kê được file', async () => {
    const admin = fakeAdmin({ listError: { message: 'storage down' } })

    expect(await reasonOf(deleteAccount(USER))).toBe('bucket-cleanup')
    expect(admin.deleteUser).not.toHaveBeenCalled()
  })

  it('báo lỗi khi xoá auth user thất bại', async () => {
    fakeAdmin({
      listing: { [USER]: [[file('ao.png')]] },
      deleteUserError: { message: 'auth down' },
    })

    expect(await reasonOf(deleteAccount(USER))).toBe('auth-delete')
  })

  it('không nhét dữ liệu cá nhân vào thông điệp lỗi', async () => {
    // ADR-012: không log/ném ra đường dẫn ảnh hay id người dùng.
    fakeAdmin({
      listing: { [USER]: [[file('ao.png')]] },
      removeError: { message: 'storage down' },
    })

    let message = ''
    try {
      await deleteAccount(USER)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).not.toContain(USER)
    expect(message).not.toContain('ao.png')
  })
})
