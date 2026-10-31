import { describe, expect, it, vi } from 'vitest'
import type { StylistVocabulary } from '@/types/stylist'
import { GARMENT_TAG_SYSTEM_PROMPT } from './prompts'
import { createGeminiTagger } from './tagger-gemini'
import type { GarmentTag, TagRequest } from './tagger'

const vocabulary: StylistVocabulary = {
  styles: [{ slug: 'modern-classic', name: 'Modern Classic', tagline: 'Đường cắt gọn.' }],
  colors: [{ slug: 'kem', name: 'Kem' }],
}

function request(): TagRequest {
  return {
    photo: { mediaType: 'image/png', data: new Uint8Array([1, 2, 3]) },
    vocabulary,
  }
}

const validTag: GarmentTag = {
  name: 'Áo sơ mi trắng',
  category: 'tops',
  colorSlugs: ['kem'],
  styleSlugs: ['modern-classic'],
  occasions: ['work'],
  fit: 'relaxed',
  attributes: [],
  note: null,
}

describe('createGeminiTagger', () => {
  it('không gọi model thật khi thiếu key (không chạm mạng trong test)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const generate = vi.fn().mockResolvedValue({ output: validTag })
    await createGeminiTagger({ generate }).tag(request())
    expect(spy).not.toHaveBeenCalled()
  })

  it('đính ảnh món đồ dưới dạng file part với mediaType', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validTag })
    await createGeminiTagger({ generate }).tag(request())
    const call = generate.mock.calls[0]?.[0] as { messages: Array<{ content: unknown[] }> }
    const parts = call.messages[0]?.content ?? []
    expect(parts).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'file', mediaType: 'image/png' })]),
    )
  })

  it('bỏ giá trị lạ model trả về thay vì ghi vào kết quả', async () => {
    const generate = vi.fn().mockResolvedValue({
      output: { ...validTag, category: 'spacesuit' },
    })
    await expect(createGeminiTagger({ generate }).tag(request())).rejects.toThrow()
  })

  it('bỏ màu lạ model trả về dù không có trong vocabulary', async () => {
    const generate = vi.fn().mockResolvedValue({
      output: { ...validTag, colorSlugs: ['mau-khong-ton-tai'] },
    })
    await expect(createGeminiTagger({ generate }).tag(request())).rejects.toThrow()
  })

  it('chuyển tiếp AbortSignal xuống SDK', async () => {
    const generate = vi.fn().mockResolvedValue({ output: validTag })
    const controller = new AbortController()
    await createGeminiTagger({ generate }).tag(request(), { signal: controller.signal })
    const call = generate.mock.calls[0]?.[0] as { abortSignal?: AbortSignal }
    expect(call.abortSignal).toBe(controller.signal)
  })

  it('throw khi provider lỗi, không trả object nửa vời', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('429'))
    await expect(createGeminiTagger({ generate }).tag(request())).rejects.toThrow('429')
  })

  it('prompt chỉ hỏi về món đồ, cấm mô tả người và suy luận về chủ sở hữu', () => {
    expect(GARMENT_TAG_SYSTEM_PROMPT).toMatch(/không.*(mô tả|suy luận).*(người|chủ sở hữu)/i)
  })

  it('có id là "gemini"', () => {
    expect(createGeminiTagger().id).toBe('gemini')
  })
})
