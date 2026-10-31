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
import { getAuthState, requireUserId } from './guard'

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
