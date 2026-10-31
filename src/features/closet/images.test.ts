import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

// Imported after the mock, same reasoning as `src/features/account/guard.test.ts`:
// `server.ts` pulls in `next/headers`, which only resolves inside a real
// request render.
import { closetImagePath, signClosetImage } from './images'

describe('closetImagePath', () => {
  it('đặt userId ở segment đầu', () => {
    expect(closetImagePath('u1', 'a.jpg')).toBe('u1/a.jpg')
  })

  it('giữ nguyên tên file có phần mở rộng/khoảng trắng bất kỳ', () => {
    expect(closetImagePath('user-42', 'áo dài 2026.png')).toBe('user-42/áo dài 2026.png')
  })
})

describe('signClosetImage', () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset()
  })

  it('trả null khi Supabase chưa cấu hình', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const url = await signClosetImage('u1/a.jpg')

    expect(url).toBeNull()
  })

  it('ký đúng bucket closet và đúng path được truyền vào', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.example/u1/a.jpg' },
      error: null,
    })
    const from = vi.fn().mockReturnValue({ createSignedUrl })
    createSupabaseServerClient.mockResolvedValue({ storage: { from } })

    const url = await signClosetImage('u1/a.jpg')

    expect(from).toHaveBeenCalledWith('closet')
    expect(createSignedUrl).toHaveBeenCalledWith('u1/a.jpg', expect.any(Number))
    expect(url).toBe('https://signed.example/u1/a.jpg')
  })

  it('trả null khi Supabase báo lỗi ký URL, không throw', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue({ storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } })

    const url = await signClosetImage('u1/a.jpg')

    expect(url).toBeNull()
  })
})
