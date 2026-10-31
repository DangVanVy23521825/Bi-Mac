import { describe, expect, it } from 'vitest'
import type { StylistVocabulary } from '@/types/stylist'
import { createDeterministicTagger } from './tagger-deterministic'
import type { TagRequest } from './tagger'

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

describe('createDeterministicTagger', () => {
  it('trả nhãn trống để người dùng tự điền, không ném lỗi', async () => {
    const tag = await createDeterministicTagger().tag(request())
    expect(tag.category).toBe('tops')
    expect(tag.occasions).toEqual([])
    expect(tag.colorSlugs).toEqual([])
    expect(tag.styleSlugs).toEqual([])
    expect(tag.attributes).toEqual([])
    expect(tag.fit).toBeNull()
    expect(tag.name).toMatch(/\p{Script=Latin}/u)
  })

  it('có id là "deterministic"', () => {
    expect(createDeterministicTagger().id).toBe('deterministic')
  })
})
