import { describe, expect, it, vi } from 'vitest'
import type { AnalyzeRequest, ExplainRequest } from './provider'
import { createDeterministicProvider } from './deterministic'
import { stylistAnalysisSchema } from './schema'
import type { Occasion, OutfitDescriptor, StylistVocabulary } from '@/types/stylist'

const vocabulary: StylistVocabulary = {
  styles: [
    {
      slug: 'modern-classic',
      name: 'Modern Classic',
      tagline: 'Đường cắt gọn, màu tiết chế, mặc được mười năm không cũ.',
    },
    {
      slug: 'quiet-luxury',
      name: 'Quiet Luxury',
      tagline: 'Không logo, không ồn ào. Chất liệu và dáng áo nói thay.',
    },
    {
      slug: 'minimalist',
      name: 'Minimalist',
      tagline: 'Ít chi tiết nhất có thể, nhưng mỗi chi tiết đều đúng chỗ.',
    },
    {
      slug: 'soft-feminine',
      name: 'Soft Feminine',
      tagline: 'Mềm mà không ngọt. Dáng rủ, màu ấm, đường viền nhẹ.',
    },
    {
      slug: 'casual-chic',
      name: 'Casual Chic',
      tagline: 'Thoải mái nhưng vẫn có chủ ý. Thường ngày mà không tạm bợ.',
    },
  ],
  colors: [
    { slug: 'kem', name: 'Kem' },
    { slug: 'chocolate', name: 'Chocolate' },
    { slug: 'burgundy', name: 'Burgundy' },
    { slug: 'be-xam', name: 'Be xám' },
    { slug: 'den', name: 'Đen' },
  ],
}

const outfitDescriptors: Record<string, OutfitDescriptor> = {
  'modern-classic-di-lam': {
    slug: 'modern-classic-di-lam',
    name: 'Modern Classic đi làm',
    itemNames: ['Sơ mi trắng', 'Quần wide-leg', 'Loafer'],
    colorNames: ['Kem', 'Chocolate', 'Đen'],
    styleNames: ['Modern Classic'],
  },
  'quiet-luxury-ngay-thuong': {
    slug: 'quiet-luxury-ngay-thuong',
    name: 'Quiet Luxury ngày thường',
    itemNames: ['Cardigan len', 'Quần âu ống rộng', 'Loafer'],
    colorNames: ['Burgundy', 'Chocolate'],
    styleNames: ['Quiet Luxury'],
  },
}

function request(occasions: Occasion[] = ['work']): AnalyzeRequest {
  return {
    answers: {
      occasions,
      fitPreference: 'unsure',
      avoids: [],
      goal: 'style',
    },
    vocabulary,
  }
}

function withOccasions(occasions: Occasion[]): AnalyzeRequest {
  return request(occasions)
}

function explainRequestFor(outfitSlugs: string[]): ExplainRequest {
  return {
    answers: request().answers,
    vocabulary,
    outfits: outfitSlugs.map((slug) => {
      const descriptor = outfitDescriptors[slug]
      if (!descriptor) throw new Error(`Thiếu outfit descriptor cho slug: ${slug}`)
      return descriptor
    }),
  }
}

const provider = createDeterministicProvider()

describe('createDeterministicProvider', () => {
  it('có id là deterministic', () => {
    expect(provider.id).toBe('deterministic')
  })

  it('luôn trả analysis hợp schema', async () => {
    const analysis = await provider.analyze(request())
    expect(stylistAnalysisSchema.safeParse(analysis).success).toBe(true)
  })

  it('chỉ trả slug có trong vocabulary được truyền vào', async () => {
    const analysis = await provider.analyze(request())
    const known = new Set(request().vocabulary.styles.map((s) => s.slug))
    for (const d of analysis.styleDirections) expect(known).toContain(d.styleSlug)
  })

  it('cùng input cho cùng output', async () => {
    expect(await provider.analyze(request())).toEqual(await provider.analyze(request()))
  })

  it('đổi dịp mặc thì đổi hướng style', async () => {
    const work = await provider.analyze(withOccasions(['work']))
    const date = await provider.analyze(withOccasions(['date']))
    const workFirst = work.styleDirections[0]
    const dateFirst = date.styleDirections[0]
    expect(workFirst).toBeDefined()
    expect(dateFirst).toBeDefined()
    expect(workFirst?.styleSlug).not.toBe(dateFirst?.styleSlug)
  })

  it('affinity giảm dần 0.8/0.6/0.4', async () => {
    const analysis = await provider.analyze(withOccasions(['work']))
    const affinities = analysis.styleDirections.map((d) => d.affinity)
    expect(affinities).toEqual([0.8, 0.6, 0.4].slice(0, affinities.length))
  })

  it('notes nêu rõ đây là kết quả từ chế độ dự phòng', async () => {
    const analysis = await provider.analyze(request())
    expect(analysis.notes.length).toBeGreaterThan(0)
    const joined = analysis.notes.join(' ')
    expect(joined).toMatch(/dự phòng/)
  })

  it('chỉ giải thích đúng các outfit được hỏi', async () => {
    const req = explainRequestFor(['modern-classic-di-lam', 'quiet-luxury-ngay-thuong'])
    const result = await provider.explain(req)
    expect(result.outfits.map((o) => o.outfitSlug)).toEqual([
      'modern-classic-di-lam',
      'quiet-luxury-ngay-thuong',
    ])
  })

  it('whyThisWorks dùng tên món và màu thật, không nói chung', async () => {
    const req = explainRequestFor(['modern-classic-di-lam'])
    const result = await provider.explain(req)
    const first = result.outfits[0]
    expect(first).toBeDefined()
    expect(first?.whyThisWorks).toContain('Sơ mi trắng')
    expect(first?.whyThisWorks).toMatch(/Kem|Chocolate|Đen/)
  })

  it('không gọi mạng', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await provider.analyze(request())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
