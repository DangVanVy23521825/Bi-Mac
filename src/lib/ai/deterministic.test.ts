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

  it('đa-dịp: thứ tự caller có ý nghĩa (ghim hành vi thật của code, không phải lựa chọn tuỳ ý)', async () => {
    const workThenDate = await provider.analyze(withOccasions(['work', 'date']))
    const dateThenWork = await provider.analyze(withOccasions(['date', 'work']))
    expect(workThenDate.styleDirections.map((d) => d.styleSlug)).toEqual([
      'modern-classic',
      'minimalist',
      'quiet-luxury',
    ])
    expect(dateThenWork.styleDirections.map((d) => d.styleSlug)).toEqual([
      'soft-feminine',
      'quiet-luxury',
      'casual-chic',
    ])
  })

  it('đa-dịp: first-occurrence-wins, slug trùng giữa hai bảng chỉ xuất hiện một lần ở vị trí của lần gặp đầu', async () => {
    // work: ['modern-classic', 'minimalist', 'quiet-luxury']
    // casual: ['casual-chic', 'quiet-luxury', 'modern-classic']
    // 'quiet-luxury' và 'modern-classic' đều có mặt trong cả hai bảng; vì
    // 'work' được gặp trước, thứ hạng của chúng phải đến từ vị trí trong
    // bảng 'work', và mỗi slug chỉ được xuất hiện đúng một lần ở kết quả.
    const analysis = await provider.analyze(withOccasions(['work', 'casual']))
    const slugs = analysis.styleDirections.map((d) => d.styleSlug)
    expect(slugs).toEqual(['modern-classic', 'minimalist', 'quiet-luxury'])
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('đa-dịp: vẫn tất định cho cùng một mảng dịp nhiều phần tử', async () => {
    const first = await provider.analyze(withOccasions(['work', 'date']))
    const second = await provider.analyze(withOccasions(['work', 'date']))
    expect(first).toEqual(second)
  })

  it('đa-dịp: styleDirections không vượt quá 3 dù ba dịp gộp lại cho 9 ứng viên, và đúng 3 slug theo đúng vị trí', async () => {
    // work: modern-classic, minimalist, quiet-luxury
    // date: soft-feminine, quiet-luxury (seen), casual-chic
    // event: quiet-luxury (seen), modern-classic (seen), soft-feminine (seen)
    // => 5 slug duy nhất trước khi cắt, slice(0,3) phải ra đúng 3 slug đầu của work, đúng vị trí.
    const analysis = await provider.analyze(withOccasions(['work', 'date', 'event']))
    expect(analysis.styleDirections.map((d) => d.styleSlug)).toEqual([
      'modern-classic',
      'minimalist',
      'quiet-luxury',
    ])
  })

  it('notes nêu rõ đây là kết quả từ chế độ dự phòng', async () => {
    const analysis = await provider.analyze(request())
    expect(analysis.notes.length).toBeGreaterThan(0)
    const joined = analysis.notes.join(' ')
    expect(joined).toMatch(/dự phòng/)
  })

  // Khôi phục: bị thay bằng test "phân biệt được sau khi lược tên" ngay
  // dưới đây thay vì giữ cả hai — hai test kiểm hai thuộc tính khác nhau.
  // Test này: mỗi reason phải GỌI ĐÚNG TÊN màu nó đang nói tới (không phải
  // lý do chung chung không gắn với màu nào cụ thể). Test dưới: các reason
  // khác nhau phải khác nhau ở phần còn lại sau khi lược tên, không chỉ
  // khác nhau vì nội suy tên vào một template giống nhau. Thiếu test này,
  // một implementation trả cùng một câu "chung" cho mọi màu (chỉ khác ở
  // việc có chứa tên màu ở đâu đó không liên quan) vẫn có thể qua được
  // test "phân biệt" nếu phần còn lại ngẫu nhiên khác nhau.
  it('palette: mỗi reason gọi đúng tên màu của chính nó', async () => {
    const analysis = await provider.analyze(request())
    expect(analysis.palette.length).toBeGreaterThan(0)
    for (const entry of analysis.palette) {
      const color = vocabulary.colors.find((c) => c.slug === entry.colorSlug)
      expect(color, `colorSlug ${entry.colorSlug}`).toBeDefined()
      expect(entry.reason, `màu ${entry.colorSlug}`).toContain(color!.name)
    }
  })

  it('palette: lược tên màu của chính nó rồi vẫn phân biệt được — không phải "distinct" giả do nội suy tên', async () => {
    // Nội suy color.name vào một template y nhau cũng làm mọi filler trông
    // "distinct". Discriminator thật: lược tên của CHÍNH màu đó ra khỏi
    // reason, chuẩn hoá khoảng trắng, rồi mới so các chuỗi còn lại —
    // template filler cũ sẽ trùng khít sau khi lược tên; mô tả vai trò
    // (nền / giữa / điểm neo cuối) thì không.
    const analysis = await provider.analyze(request())
    expect(analysis.palette.length).toBeGreaterThan(1)
    const stripped = analysis.palette.map((entry) => {
      const color = vocabulary.colors.find((c) => c.slug === entry.colorSlug)
      const ownName = color?.name ?? ''
      const withoutOwnName = ownName ? entry.reason.split(ownName).join('') : entry.reason
      return withoutOwnName.replace(/\s+/g, ' ').trim()
    })
    expect(new Set(stripped).size).toBe(stripped.length)
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
