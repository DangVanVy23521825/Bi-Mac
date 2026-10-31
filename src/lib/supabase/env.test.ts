import { describe, expect, it } from 'vitest'

import { getSupabaseEnv, isSupabaseConfigured } from './env'

describe('getSupabaseEnv', () => {
  it('trả null khi thiếu biến môi trường', () => {
    expect(getSupabaseEnv({})).toBeNull()
  })

  it('trả null khi chỉ có url mà thiếu anon key', () => {
    expect(getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull()
  })

  it('trả null khi url không hợp lệ', () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toBeNull()
  })

  it('trả env khi có đủ hai biến', () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon' })
  })
})

describe('isSupabaseConfigured', () => {
  it('false khi env rỗng', () => {
    expect(isSupabaseConfigured({})).toBe(false)
  })

  it('true khi có đủ hai biến', () => {
    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toBe(true)
  })
})
