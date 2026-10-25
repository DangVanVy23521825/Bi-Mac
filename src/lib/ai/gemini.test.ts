import { describe, expect, it, vi } from 'vitest'
import type { Occasion, OutfitDescriptor, StylistVocabulary } from '@/types/stylist'
import type { AnalyzeRequest, ExplainRequest } from './provider'
import type { StylistAnalysis, StylistExplanation } from './schema'
import { ANALYSIS_SYSTEM_PROMPT, EXPLAIN_SYSTEM_PROMPT } from './prompts'
import { DEFAULT_MODEL_ID, resolveModelId } from './model'
import { createGeminiProvider } from './gemini'

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
  'slip-dress-trench-buoi-toi': {
    slug: 'slip-dress-trench-buoi-toi',
    name: 'Slip dress & trench buổi tối',
    itemNames: ['Slip dress', 'Trench coat'],
    colorNames: ['Burgundy', 'Đen'],
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

const explainRequest = explainRequestFor(['modern-classic-di-lam'])

const validAnalysis: StylistAnalysis = {
  styleDirections: [
    { styleSlug: 'modern-classic', affinity: 0.8, reason: 'Hợp dịp đi làm bạn chọn.' },
  ],
  palette: [{ colorSlug: 'kem', reason: 'Tông nền trung tính, dễ phối.' }],
  notes: ['Gợi ý dựa trên câu trả lời của bạn.'],
}

const validExplanation: StylistExplanation = {
  outfits: [
    {
      outfitSlug: 'modern-classic-di-lam',
      whyThisWorks: 'Set giữ tỷ lệ gọn, hợp dịp đi làm bạn đã chọn.',
    },
  ],
}

describe('resolveModelId', () => {
  it('model id mặc định có thể override bằng env', () => {
    expect(
      resolveModelId({ BIMAC_STYLIST_MODEL: 'gemini-x' } as unknown as NodeJS.ProcessEnv),
    ).toBe('gemini-x')
    expect(resolveModelId({} as unknown as NodeJS.ProcessEnv)).toBe(DEFAULT_MODEL_ID)
  })
})

describe('createGeminiProvider', () => {
  it('gửi danh sách slug hợp lệ vào prompt', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
    await createGeminiProvider({ generate }).analyze(request())
    const call = generate.mock.calls[0]?.[0]
    const prompt = JSON.stringify(call)
    expect(prompt).toContain('minimalist')
    expect(prompt).toContain('burgundy')
  })

  it('đính ảnh dưới dạng file part với mediaType', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
    await createGeminiProvider({ generate }).analyze({
      ...request(),
      photo: { mediaType: 'image/png', data: new Uint8Array([1, 2, 3]) },
    })
    const call = generate.mock.calls[0]?.[0] as { messages: Array<{ content: unknown[] }> }
    const parts = call.messages[0]?.content ?? []
    expect(parts).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'file', mediaType: 'image/png' })]),
    )
  })

  it('không gửi part ảnh khi không có ảnh', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
    await createGeminiProvider({ generate }).analyze(request())
    const call = generate.mock.calls[0]?.[0] as { messages: Array<{ content: unknown[] }> }
    const parts = call.messages[0]?.content ?? []
    expect(parts.some((p) => (p as { type: string }).type === 'file')).toBe(false)
  })

  it('throw khi output không hợp schema', async () => {
    const generate = vi.fn().mockResolvedValue({ output: { styleDirections: 'sai' } })
    await expect(createGeminiProvider({ generate }).analyze(request())).rejects.toThrow()
  })

  it('throw khi provider lỗi, không trả object nửa vời', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('429'))
    await expect(createGeminiProvider({ generate }).analyze(request())).rejects.toThrow('429')
  })

  it('explain chỉ hỏi về đúng outfit được truyền vào', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validExplanation })
    await createGeminiProvider({ generate }).explain(explainRequest)
    const call = generate.mock.calls[0]?.[0]
    const prompt = JSON.stringify(call)
    expect(prompt).toContain('modern-classic-di-lam')
    expect(prompt).not.toContain('slip-dress-trench-buoi-toi')
  })

  it('prompt chứa ràng buộc an toàn', () => {
    for (const prompt of [ANALYSIS_SYSTEM_PROMPT, EXPLAIN_SYSTEM_PROMPT]) {
      expect(prompt).toMatch(/không.*(chấm điểm|nhận xét).*(cơ thể|ngoại hình)/i)
    }
  })

  it('không gọi mạng trong test', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await createGeminiProvider({
      generate: vi.fn().mockResolvedValue({ output: validAnalysis }),
    }).analyze(request())
    expect(spy).not.toHaveBeenCalled()
  })
})
