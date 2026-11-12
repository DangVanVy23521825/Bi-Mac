import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserId } = vi.hoisted(() => ({ getCurrentUserId: vi.fn() }))
vi.mock('@/lib/supabase/session', () => ({ getCurrentUserId }))

const { consumeTagQuota } = vi.hoisted(() => ({ consumeTagQuota: vi.fn() }))
vi.mock('@/features/closet/quota', () => ({ consumeTagQuota, TAG_DAILY_LIMIT: 60 }))

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { geminiTag } = vi.hoisted(() => ({ geminiTag: vi.fn() }))
vi.mock('@/lib/ai/tagger-gemini', () => ({
  createGeminiTagger: () => ({ id: 'gemini' as const, tag: geminiTag }),
}))

// Imported after every mock above, same reasoning as the sibling tests in
// this codebase (`guard.test.ts`, `images.test.ts`): `session.ts`/`server.ts`
// pull in `next/headers`, which only resolves inside a real request render.
import { POST } from './route'

function request(body: unknown): Request {
  return new Request('http://localhost/api/closet/tag', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

describe('POST /api/closet/tag', () => {
  beforeEach(() => {
    getCurrentUserId.mockReset()
    consumeTagQuota.mockReset()
    createSupabaseServerClient.mockReset()
    geminiTag.mockReset()

    // Default: signed in, under quota, no key (ambient — see
    // vitest.config.mts) — the baseline every test starts from and only
    // overrides what it actually needs to.
    getCurrentUserId.mockResolvedValue('u1')
    consumeTagQuota.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('401 khi chưa đăng nhập', async () => {
    getCurrentUserId.mockResolvedValue(null)

    const res = await POST(request({ imagePath: 'u1/ao.jpg' }))

    expect(res.status).toBe(401)
    expect(consumeTagQuota).not.toHaveBeenCalled()
  })

  it('400 khi imagePath không thuộc thư mục của chính user', async () => {
    const res = await POST(request({ imagePath: 'u2/ao-cua-nguoi-khac.jpg' }))

    expect(res.status).toBe(400)
    // Load-bearing: quota chưa từng được chạm tới, và storage chưa từng
    // được gọi — cái path sai phải bị chặn trước cả hai bước đó, không
    // phải bị chặn ở một bước xa hơn (ví dụ do RLS tình cờ từ chối).
    expect(consumeTagQuota).not.toHaveBeenCalled()
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('400 khi thiếu imagePath', async () => {
    const res = await POST(request({}))
    expect(res.status).toBe(400)
  })

  it('trả nhãn deterministic kèm degradedReason khi thiếu key, không 429', async () => {
    const res = await POST(request({ imagePath: 'u1/ao.jpg' }))

    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.degradedReason).toBe('no-key')
    expect(body.labelSource).toBe('ai')
    expect(body.tag).toMatchObject({ name: 'Món đồ mới', category: 'tops', fit: null })
    expect(geminiTag).not.toHaveBeenCalled()
  })

  // Test này hỏng nếu route gọi thẳng primary bất kể quota nói gì — chỉ
  // assert status/degradedReason thì một route bỏ qua quota hoàn toàn vẫn
  // qua được (vì ambient không có key nên primary vốn đã null); spy
  // `geminiTag` mới thật sự bắt được việc primary bị gọi khi không nên.
  it('vượt hạn mức vẫn trả 200 với nhãn deterministic', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-key-for-test')
    consumeTagQuota.mockResolvedValue(false)

    const res = await POST(request({ imagePath: 'u1/ao.jpg' }))

    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.degradedReason).toBe('quota-exceeded')
    expect(body.labelSource).toBe('ai')
    expect(body.tag).toMatchObject({ name: 'Món đồ mới' })
    expect(geminiTag).not.toHaveBeenCalled()
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('gọi primary và tải ảnh qua storage.download khi có key và còn hạn mức', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-key-for-test')
    const download = vi.fn().mockResolvedValue({
      data: { type: 'image/png', arrayBuffer: async () => new ArrayBuffer(4) },
      error: null,
    })
    const from = vi.fn().mockReturnValue({ download })
    createSupabaseServerClient.mockResolvedValue({ storage: { from } })
    geminiTag.mockResolvedValue({
      name: 'Áo sơ mi trắng',
      category: 'tops',
      colorSlugs: [],
      styleSlugs: [],
      occasions: [],
      fit: null,
      attributes: [],
      note: null,
    })

    const res = await POST(request({ imagePath: 'u1/ao.jpg' }))

    expect(res.status).toBe(200)
    const body = await json(res)
    expect(from).toHaveBeenCalledWith('closet')
    expect(download).toHaveBeenCalledWith('u1/ao.jpg')
    expect(geminiTag).toHaveBeenCalledTimes(1)
    expect(body.degradedReason).toBeNull()
    expect(body.tag).toMatchObject({ name: 'Áo sơ mi trắng' })
  })

  it('rơi về deterministic khi tải ảnh thất bại, vẫn trả 200', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-key-for-test')
    const download = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue({ storage: { from: vi.fn().mockReturnValue({ download }) } })

    const res = await POST(request({ imagePath: 'u1/ao.jpg' }))

    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.degradedReason).toBe('provider-error')
    expect(geminiTag).not.toHaveBeenCalled()
  })

  it('không log đường dẫn ảnh hay nội dung ảnh', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const errSpy = vi.spyOn(console, 'error')

    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-key-for-test')
    const download = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue({ storage: { from: vi.fn().mockReturnValue({ download }) } })

    await POST(request({ imagePath: 'u1/bi-mat-rieng-tu.jpg' }))

    for (const spy of [logSpy, errSpy]) {
      for (const call of spy.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toMatch(/bi-mat-rieng-tu|Uint8Array|ArrayBuffer/)
      }
    }
  })
})
