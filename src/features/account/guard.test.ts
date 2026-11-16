import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isSupabaseConfigured } = vi.hoisted(() => ({ isSupabaseConfigured: vi.fn() }))
const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
const { getCurrentUserId } = vi.hoisted(() => ({ getCurrentUserId: vi.fn() }))
const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))

vi.mock('@/lib/supabase/env', () => ({ isSupabaseConfigured }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))
vi.mock('@/lib/supabase/session', () => ({ getCurrentUserId }))
vi.mock('next/navigation', () => ({ redirect }))

// Import after the mocks above so `guard.ts` picks up the mocked modules
// instead of the real ones (`next/headers` in particular must never be
// touched here — it throws outside a real request render).
import { getAuthState, getViewer, requireUserId } from './guard'

describe('getAuthState', () => {
  beforeEach(() => {
    isSupabaseConfigured.mockReset()
    createSupabaseServerClient.mockReset()
  })

  it('trả unconfigured khi thiếu env Supabase', async () => {
    isSupabaseConfigured.mockReturnValue(false)

    const state = await getAuthState()

    expect(state).toEqual({ status: 'unconfigured' })
    // Không được tiếp tục tạo client khi đã biết chưa cấu hình.
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('trả signed-out khi không có user', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const state = await getAuthState()

    expect(state).toEqual({ status: 'signed-out' })
  })

  it('trả signed-in kèm displayName lấy từ user_metadata.full_name', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'u1',
              email: 'vy@example.com',
              user_metadata: { full_name: 'Vy Nguyễn' },
            },
          },
        }),
      },
    })

    const state = await getAuthState()

    expect(state).toEqual({ status: 'signed-in', displayName: 'Vy Nguyễn' })
  })

  // Task 1's review flagged `getCurrentUserId()` for not guarding
  // `auth.getUser()` against throwing. `getAuthState()` calls `getUser()`
  // itself (it needs the full user, not just the id) so it must carry the
  // same guard: a transient Supabase outage must read as signed-out, not
  // crash every page that renders the header.
  it('trả signed-out khi auth.getUser() throw (Supabase lỗi tạm thời)', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockRejectedValue(new Error('network lỗi')) },
    })

    const state = await getAuthState()

    expect(state).toEqual({ status: 'signed-out' })
  })
})

// Review toàn nhánh, Important #5: `/wardrobe/[category]/[slug]` và
// `/styles/[slug]` — hai trang CÔNG KHAI, chia sẻ được bằng link — gọi
// `getAuthState()` rồi gọi thêm `getCurrentUserId()` không có guard, tức
// một lượt gọi mạng thứ hai cho cùng một câu hỏi, và một lần lỗi chớp
// nhoáng ở lượt đó là một trang lỗi ngay cửa trước của sản phẩm.
// `getViewer()` trả cả hai nửa từ một lượt `auth.getUser()` duy nhất, nên
// hai trang đó bỏ hẳn lời gọi thứ hai.
describe('getViewer', () => {
  beforeEach(() => {
    isSupabaseConfigured.mockReset()
    createSupabaseServerClient.mockReset()
  })

  it('trả userId cùng với trạng thái signed-in, từ một lượt getUser duy nhất', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', email: 'vy@example.com', user_metadata: { full_name: 'Vy Nguyễn' } } },
    })
    createSupabaseServerClient.mockResolvedValue({ auth: { getUser } })

    const viewer = await getViewer()

    expect(viewer).toEqual({
      authState: { status: 'signed-in', displayName: 'Vy Nguyễn' },
      userId: 'u1',
    })
    // "Một lượt duy nhất" là nửa còn lại của fix: tiết kiệm đúng một
    // round-trip auth mỗi request cho khách đã đăng nhập.
    expect(getUser).toHaveBeenCalledTimes(1)
  })

  it('userId là null khi chưa đăng nhập', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })

    expect(await getViewer()).toEqual({ authState: { status: 'signed-out' }, userId: null })
  })

  it('userId là null khi chưa cấu hình Supabase, và không tạo client', async () => {
    isSupabaseConfigured.mockReturnValue(false)

    expect(await getViewer()).toEqual({ authState: { status: 'unconfigured' }, userId: null })
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('auth.getUser() throw thì đọc ra signed-out, không làm sập trang công khai', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockRejectedValue(new Error('network lỗi')) },
    })

    expect(await getViewer()).toEqual({ authState: { status: 'signed-out' }, userId: null })
  })

  // Lỗi thật đã xảy ra, phát hiện khi chạy suite với `.env.local` đã nạp:
  // `createSupabaseServerClient()` gọi `cookies()` của `next/headers`, và
  // `cookies()` ném khi ở ngoài phạm vi một request. Lời gọi đó từng nằm
  // NGOÀI `try`, nên `styles.test.tsx` và `item-detail.test.tsx` — hai file
  // gọi thẳng hàm page — chỉ pass khi KHÔNG có biến Supabase. Suite đổi kết
  // quả theo môi trường của lập trình viên, đúng kiểu lỗi làm người ta mất
  // niềm tin vào test.
  it('createSupabaseServerClient() throw thì cũng đọc ra signed-out, không chỉ getUser()', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockRejectedValue(
      new Error('`cookies` was called outside a request scope.'),
    )

    expect(await getViewer()).toEqual({ authState: { status: 'signed-out' }, userId: null })
  })

  it('getAuthState() thừa hưởng cùng hàng rào đó', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    createSupabaseServerClient.mockRejectedValue(
      new Error('`cookies` was called outside a request scope.'),
    )

    expect(await getAuthState()).toEqual({ status: 'signed-out' })
  })
})

describe('requireUserId', () => {
  beforeEach(() => {
    getCurrentUserId.mockReset()
    redirect.mockReset()
  })

  it('redirect về / khi chưa đăng nhập', async () => {
    getCurrentUserId.mockResolvedValue(null)
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(requireUserId()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('trả về userId khi đã đăng nhập, không redirect', async () => {
    getCurrentUserId.mockResolvedValue('u1')

    const userId = await requireUserId()

    expect(userId).toBe('u1')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirect về / khi getCurrentUserId() throw thay vì làm sập trang', async () => {
    getCurrentUserId.mockRejectedValue(new Error('network lỗi'))
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(requireUserId()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/')
  })
})
