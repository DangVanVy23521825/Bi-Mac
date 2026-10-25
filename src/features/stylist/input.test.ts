import { describe, expect, it } from 'vitest'
import { stylistAnalysisSchema } from '@/lib/ai/schema'
import { stylistInputSchema } from '@/features/stylist/input'

describe('stylistInputSchema', () => {
  it('nhận input hợp lệ', () => {
    const parsed = stylistInputSchema.safeParse({
      answers: { occasions: ['work'], fitPreference: 'relaxed', avoids: [], goal: 'outfits' },
    })
    expect(parsed.success).toBe(true)
  })

  it('từ chối dịp mặc không có trong vocabulary', () => {
    const parsed = stylistInputSchema.safeParse({
      answers: { occasions: ['gym'], fitPreference: 'unsure', avoids: [], goal: 'style' },
    })
    expect(parsed.success).toBe(false)
  })

  it('từ chối khi không chọn dịp mặc nào', () => {
    const parsed = stylistInputSchema.safeParse({
      answers: { occasions: [], fitPreference: 'unsure', avoids: [], goal: 'style' },
    })
    expect(parsed.success).toBe(false)
  })

  it('cho phép không gửi ảnh', () => {
    const parsed = stylistInputSchema.safeParse({
      answers: { occasions: ['date'], fitPreference: 'unsure', avoids: ['sheer'], goal: 'colors' },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      throw new Error('expected success')
    }
    expect(parsed.data.photo).toBeUndefined()
  })
})

describe('stylistAnalysisSchema', () => {
  it('clamp affinity ngoài khoảng [0,1] thành không hợp lệ', () => {
    expect(
      stylistAnalysisSchema.safeParse({
        styleDirections: [{ styleSlug: 'minimalist', affinity: 1.4, reason: 'x' }],
        palette: [],
        notes: [],
      }).success,
    ).toBe(false)
  })

  it('từ chối analysis thiếu lý do', () => {
    expect(
      stylistAnalysisSchema.safeParse({
        styleDirections: [{ styleSlug: 'minimalist', affinity: 0.5, reason: '' }],
        palette: [],
        notes: [],
      }).success,
    ).toBe(false)
  })
})
