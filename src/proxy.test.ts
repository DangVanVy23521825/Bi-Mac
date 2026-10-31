import { describe, expect, it, vi } from 'vitest'

const { getAuthState } = vi.hoisted(() => ({ getAuthState: vi.fn() }))
vi.mock('@/features/account/guard', () => ({ getAuthState }))

import { config, proxy } from './proxy'

// Proves the gate actually rejects, not just that it is wired up: a 401
// response body/status asserted on real output, not a mock echoing back
// what the test fed it.
describe('proxy — ranh giới /api/closet', () => {
  it('chặn 401 khi chưa đăng nhập, không chạm tới route handler', async () => {
    getAuthState.mockResolvedValue({ status: 'signed-out' })

    const response = await proxy()

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Cần đăng nhập để dùng chức năng này.' })
  })

  it('chặn 401 khi Supabase chưa cấu hình — không có ai "đăng nhập" được', async () => {
    getAuthState.mockResolvedValue({ status: 'unconfigured' })

    const response = await proxy()

    expect(response.status).toBe(401)
  })

  it('cho qua (NextResponse.next, không phải 401) khi đã đăng nhập', async () => {
    getAuthState.mockResolvedValue({ status: 'signed-in', displayName: 'Vy' })

    const response = await proxy()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('matcher chỉ áp cho /api/closet, không áp cho /closet hay toàn site', () => {
    expect(config.matcher).toEqual(['/api/closet/:path*'])
  })
})
