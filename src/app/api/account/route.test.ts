// `DELETE /api/account`. Một endpoint chạy bằng service-role key, tức là
// RLS **không** còn chặn gì cả: service role đi xuyên mọi policy trong
// `0001_account_and_closet.sql`. Ranh giới "chỉ xoá được chính mình" vì thế
// không nằm trong database nữa — nó nằm đúng trong file route, ở một dòng
// duy nhất: id lấy từ session, không bao giờ từ body.
//
// `src/proxy.ts` chỉ khớp `/api/closet/:path*`, nên route này **không** có
// lớp 401 bên ngoài nào đỡ hộ. Test 401 ở đây là lớp duy nhất.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserId } = vi.hoisted(() => ({ getCurrentUserId: vi.fn() }))
vi.mock('@/lib/supabase/session', () => ({ getCurrentUserId }))

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { deleteAccount } = vi.hoisted(() => ({ deleteAccount: vi.fn() }))
vi.mock('@/features/account/delete', async () => {
  // Giữ `AccountDeletionError` thật: route phân nhánh thông điệp theo
  // `reason`, và một class giả sẽ làm test đó mất nghĩa.
  const actual = await vi.importActual<typeof import('@/features/account/delete')>(
    '@/features/account/delete',
  )
  return { ...actual, deleteAccount }
})

import { AccountDeletionError } from '@/features/account/delete'
import { DELETE } from './route'

// Next.js luôn truyền một `Request` vào route handler, kể cả khi handler
// khai báo không nhận tham số nào. Gọi đúng như Next gọi — rồi khẳng định
// handler không hề đụng tới nó — mới là bằng chứng thật cho "không nhận
// userId từ body".
const handler = DELETE as unknown as (request: Request) => Promise<Response>

function request(body?: unknown): Request {
  return new Request('http://localhost/api/account', {
    method: 'DELETE',
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  })
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

function signOutSpy() {
  const signOut = vi.fn().mockResolvedValue({ error: null })
  createSupabaseServerClient.mockResolvedValue({ auth: { signOut } })
  return signOut
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    getCurrentUserId.mockReset()
    createSupabaseServerClient.mockReset()
    deleteAccount.mockReset()

    getCurrentUserId.mockResolvedValue('u1')
    deleteAccount.mockResolvedValue(undefined)
    createSupabaseServerClient.mockResolvedValue(null)
  })

  it('401 khi chưa đăng nhập', async () => {
    getCurrentUserId.mockResolvedValue(null)

    const res = await handler(request())

    expect(res.status).toBe(401)
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('401 khi Supabase lỗi lúc đọc session, không 500', async () => {
    getCurrentUserId.mockRejectedValue(new Error('auth server down'))

    const res = await handler(request())

    expect(res.status).toBe(401)
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('chỉ xoá được chính mình, không nhận userId từ body', async () => {
    signOutSpy()
    const req = request({ userId: 'nan-nhan-khac' })

    const res = await handler(req)

    expect(res.status).toBe(200)
    expect(deleteAccount).toHaveBeenCalledTimes(1)
    expect(deleteAccount).toHaveBeenCalledWith('u1')
    expect(deleteAccount).not.toHaveBeenCalledWith('nan-nhan-khac')
    // Bằng chứng trực tiếp: body chưa từng được đọc.
    expect(req.bodyUsed).toBe(false)
  })

  it('xoá xong thì dọn luôn cookie phiên', async () => {
    const signOut = signOutSpy()

    const res = await handler(request())

    expect(res.status).toBe(200)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('vẫn trả 200 khi không dọn được cookie phiên', async () => {
    // Session trỏ tới một tài khoản vừa biến mất; `signOut` hỏng ở đây
    // không làm dữ liệu quay lại, nên không được biến thành lỗi.
    const signOut = vi.fn().mockRejectedValue(new Error('session gone'))
    createSupabaseServerClient.mockResolvedValue({ auth: { signOut } })

    const res = await handler(request())

    expect(res.status).toBe(200)
  })

  it('500 và nói rõ tài khoản còn nguyên khi dọn bucket thất bại', async () => {
    deleteAccount.mockRejectedValue(new AccountDeletionError('bucket-cleanup'))

    const res = await handler(request())

    expect(res.status).toBe(500)
    const body = await json(res)
    expect(String(body.error)).toContain('vẫn còn nguyên')
  })

  it('500 khi deleteAccount ném lỗi lạ', async () => {
    deleteAccount.mockRejectedValue(new Error('bất ngờ'))

    const res = await handler(request())

    expect(res.status).toBe(500)
    const body = await json(res)
    // Không rò chi tiết lỗi nội bộ ra ngoài.
    expect(String(body.error)).not.toContain('bất ngờ')
  })

  it('không dọn cookie phiên khi xoá thất bại', async () => {
    const signOut = signOutSpy()
    deleteAccount.mockRejectedValue(new AccountDeletionError('bucket-cleanup'))

    await handler(request())

    expect(signOut).not.toHaveBeenCalled()
  })
})
