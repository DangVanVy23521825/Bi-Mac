// Test helpers (`formRequest`, `file`, `ndjson`) aren't defined by the
// brief — built here. One wrinkle: the per-IP and daily rate limiters in
// route.ts are module-level singletons that persist across every test in
// this file (that's the whole point of them — they must survive across
// requests). To keep tests independent without a test-only reset seam on
// the route module, `formRequest` defaults `x-forwarded-for` to a value
// derived from the *current test's name* (via `expect.getState()`), hashed
// down to an ASCII-safe string (Vietnamese test names contain non-Latin1
// characters, which the Headers API rejects outright). That gives every
// test its own per-IP bucket, while repeated calls *within* one test (the
// quota-exhaustion test loops) still land on the same bucket because the
// test name doesn't change mid-test. The global daily counter is shared
// across the whole file regardless, but DAILY_LIMIT (200) is far above the
// handful of requests this suite issues, so it never interferes.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Gate used by exactly one test below ("chặng thật") to hold `explain`
// open while asserting the `analysis` NDJSON line already arrived. Every
// other test in this file goes through the *real* deterministic provider
// (no API key is set anywhere in this suite), so the gate must default to
// an already-resolved promise — `await Promise.resolve()` is a single
// microtask, invisible to every test that doesn't touch it. `vi.hoisted`
// is required here because `vi.mock` factories are hoisted above normal
// module code by Vitest's transform, so a plain top-level `let` would not
// yet exist when the factory runs.
const { getExplainGate, setExplainGate } = vi.hoisted(() => {
  let gate: Promise<void> = Promise.resolve()
  return {
    getExplainGate: () => gate,
    setExplainGate: (next: Promise<void>) => {
      gate = next
    },
  }
})

vi.mock('@/lib/ai/deterministic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/deterministic')>()
  return {
    ...actual,
    createDeterministicProvider: () => {
      const real = actual.createDeterministicProvider()
      return {
        ...real,
        explain: async (req: Parameters<typeof real.explain>[0]) => {
          await getExplainGate()
          return real.explain(req)
        },
      }
    },
  }
})

// Flag used by exactly one test below to force `runStylist` to reject
// unexpectedly, so the `.catch()` branch in `createStylistStream` — the
// only `console.error` call site in route.ts — actually runs at least
// once. `route.ts` builds its own providers and has no injection seam for
// the pipeline itself, so mocking the pipeline module (mirroring the
// `explainGate` pattern above, the least invasive option available) is
// how the test reaches that branch at all. Default `false` is a no-op
// passthrough to the real `runStylist` for every other test.
const { shouldRejectPipeline, setShouldRejectPipeline } = vi.hoisted(() => {
  let reject = false
  return {
    shouldRejectPipeline: () => reject,
    setShouldRejectPipeline: (next: boolean) => {
      reject = next
    },
  }
})

vi.mock('@/features/stylist/pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/stylist/pipeline')>()
  return {
    ...actual,
    runStylist: async (...args: Parameters<typeof actual.runStylist>) => {
      if (shouldRejectPipeline()) {
        throw new Error('simulated-unexpected-pipeline-failure')
      }
      return actual.runStylist(...args)
    },
  }
})

// Task 11's four closet seams (`getCurrentUserId`, `createSupabaseServerClient`,
// `listClosetItems`, `signClosetImage`) are mocked wholesale rather than left
// real, for the same reason the test suite has no Supabase env vars at all:
// the real `createSupabaseServerClient()` always returns `null` in this
// environment, which would make "đã đăng nhập" impossible to exercise. Each
// mock defaults in `beforeEach` to exactly today's behavior (`null`/`[]`)
// so every pre-existing test above is unaffected and closetItems stays `[]`
// unless a test below explicitly overrides one of these.
const { getCurrentUserIdMock, createSupabaseServerClientMock, listClosetItemsMock, signClosetImageMock } =
  vi.hoisted(() => ({
    getCurrentUserIdMock: vi.fn(),
    createSupabaseServerClientMock: vi.fn(),
    listClosetItemsMock: vi.fn(),
    signClosetImageMock: vi.fn(),
  }))

vi.mock('@/lib/supabase/session', () => ({
  getCurrentUserId: getCurrentUserIdMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

vi.mock('@/features/closet/repository', () => ({
  listClosetItems: listClosetItemsMock,
}))

vi.mock('@/features/closet/images', () => ({
  signClosetImage: signClosetImageMock,
}))

import { MAX_PHOTO_BYTES, PER_IP_LIMIT, POST } from './route'

const validAnswers = JSON.stringify({
  occasions: ['casual'],
  fitPreference: 'unsure',
  avoids: [],
  goal: 'outfits',
})

function hashToAsciiIp(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return `203.0.113.${Math.abs(hash) % 255}-${Math.abs(hash)}`
}

function currentTestIp(): string {
  const name = expect.getState().currentTestName ?? 'unknown-test'
  return hashToAsciiIp(name)
}

function file(name: string, type: string, size = 32): File {
  return new File([new Uint8Array(size)], name, { type })
}

function formRequest(opts: { answers?: string; photo?: File; ip?: string }): Request {
  const formData = new FormData()
  if (opts.answers !== undefined) {
    formData.append('answers', opts.answers)
  }
  if (opts.photo) {
    formData.append('photo', opts.photo)
  }
  return new Request('http://localhost/api/stylist', {
    method: 'POST',
    body: formData,
    headers: { 'x-forwarded-for': opts.ip ?? currentTestIp() },
  })
}

async function ndjson(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text()
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

describe('POST /api/stylist', () => {
  beforeEach(() => {
    setExplainGate(Promise.resolve())
    setShouldRejectPipeline(false)
    getCurrentUserIdMock.mockReset().mockResolvedValue(null)
    createSupabaseServerClientMock.mockReset().mockResolvedValue(null)
    listClosetItemsMock.mockReset().mockResolvedValue([])
    signClosetImageMock.mockReset().mockResolvedValue(null)
  })

  it('trả 400 khi answers không hợp schema', async () => {
    const res = await POST(formRequest({ answers: '{"occasions":[]}' }))
    expect(res.status).toBe(400)
  })

  it('trả 400 khi answers không phải JSON', async () => {
    expect((await POST(formRequest({ answers: 'khong-phai-json' }))).status).toBe(400)
  })

  it('trả 415 khi ảnh sai mediaType', async () => {
    const res = await POST(formRequest({ answers: validAnswers, photo: file('a.gif', 'image/gif') }))
    expect(res.status).toBe(415)
  })

  it('trả 413 khi ảnh quá to', async () => {
    const res = await POST(
      formRequest({
        answers: validAnswers,
        photo: file('a.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1),
      }),
    )
    expect(res.status).toBe(413)
  })

  it('ảnh 0 byte thì dùng fallback, không 500', async () => {
    const res = await POST(
      formRequest({
        answers: validAnswers,
        photo: file('a.jpg', 'image/jpeg', 0),
      }),
    )
    expect(res.status).toBe(200)
    const lines = await ndjson(res)
    const last = lines.at(-1)
    expect(last).toMatchObject({ providerId: 'deterministic', degraded: true })
  })

  it('trả 200 và hai dòng NDJSON cho request hợp lệ', async () => {
    const res = await POST(formRequest({ answers: validAnswers }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    const lines = await ndjson(res)
    expect(lines.map((l) => l.type)).toEqual(['analysis', 'result'])
  })

  it('vượt hạn mức thì vẫn 200 bằng fallback, không trả lỗi', async () => {
    for (let i = 0; i < PER_IP_LIMIT; i += 1) await POST(formRequest({ answers: validAnswers }))
    const res = await POST(formRequest({ answers: validAnswers }))
    expect(res.status).toBe(200)
    const lines = await ndjson(res)
    const last = lines.at(-1)
    expect(last).toMatchObject({ degradedReason: 'rate-limited' })
  })

  it('không có key thì chạy bằng fallback', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')
    const lines = await ndjson(await POST(formRequest({ answers: validAnswers })))
    const last = lines.at(-1)
    expect(last).toMatchObject({ providerId: 'deterministic', degradedReason: 'no-key' })
  })

  it('không ghi bytes ảnh ra log', async () => {
    const spy = vi.spyOn(console, 'log')
    const errSpy = vi.spyOn(console, 'error')
    await POST(formRequest({ answers: validAnswers, photo: file('a.jpg', 'image/jpeg', 32) }))
    for (const s of [spy, errSpy]) {
      for (const call of s.mock.calls) {
        expect(JSON.stringify(call)).not.toMatch(/Uint8Array|base64,|\[object ArrayBuffer\]/)
      }
    }
  })

  // The test above only proves the success path never logs bytes — but
  // the *only* `console.error` call site in route.ts is the `.catch()`
  // branch for an unexpected `runStylist` rejection, which that test never
  // triggers. A test that never exercises the one risky branch is a guard
  // that can never fail, no matter what that branch does — so this test
  // forces the rejection (via the pipeline mock above) and asserts
  // `console.error` was *actually called* before checking its arguments
  // are clean. Without the "was called" assertion this would be exactly
  // as vacuous as a zero-call pass.
  it('nhánh lỗi ngoài dự tính: console.error được gọi thật và không rò bytes ảnh', async () => {
    setShouldRejectPipeline(true)
    const spy = vi.spyOn(console, 'log')
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(formRequest({ answers: validAnswers, photo: file('a.jpg', 'image/jpeg', 32) }))
    expect(res.status).toBe(200)
    const reader = res.body!.getReader()
    await expect(reader.read()).rejects.toThrow()

    expect(errSpy).toHaveBeenCalled()
    for (const s of [spy, errSpy]) {
      for (const call of s.mock.calls) {
        expect(JSON.stringify(call)).not.toMatch(/Uint8Array|base64,|\[object ArrayBuffer\]|ArrayBuffer/)
      }
    }
  })

  // The distinguishing test for genuine two-stage streaming: gates the
  // (only ever-used-here, no key in this suite) deterministic provider's
  // `explain` on a promise we hold open, reads the stream chunk-by-chunk,
  // and asserts the `analysis` line is already on the wire while `result`
  // is still unresolved — not just that the final body happens to contain
  // two lines in order.
  it('gửi dòng analysis trong khi explain còn treo, rồi mới gửi result (chặng thật)', async () => {
    let release: () => void = () => {}
    setExplainGate(
      new Promise((resolve) => {
        release = resolve
      }),
    )

    const res = await POST(formRequest({ answers: validAnswers }))
    expect(res.status).toBe(200)
    const reader = res.body!.getReader()

    const first = await reader.read()
    expect(first.done).toBe(false)
    const firstLine = JSON.parse(new TextDecoder().decode(first.value).trim()) as Record<string, unknown>
    expect(firstLine.type).toBe('analysis')

    // `explain` is still parked on the gate — the next chunk must not be
    // ready yet. Hold the pending `read()` promise itself (don't start a
    // fresh one after releasing) so we can observe its eventual value.
    const secondReadPromise = reader.read()
    const raceOutcome = await Promise.race([
      secondReadPromise.then(() => 'arrived' as const),
      new Promise<'still-pending'>((resolve) => setTimeout(() => resolve('still-pending'), 50)),
    ])
    expect(raceOutcome).toBe('still-pending')

    release()
    const second = await secondReadPromise
    expect(second.done).toBe(false)
    const secondLine = JSON.parse(new TextDecoder().decode(second.value).trim()) as Record<string, unknown>
    expect(secondLine.type).toBe('result')
  })

  // Task 11: the `result` line's `closetItems` must come from the signed-in
  // caller's own wardrobe, and the stylist must never fail a request just
  // because reading that wardrobe went badly (Review Focus #1). Each test
  // below exercises exactly one of the degrade paths named in the brief.
  describe('closetItems trong result', () => {
    it('chưa đăng nhập vẫn chạy, closetItems rỗng', async () => {
      getCurrentUserIdMock.mockResolvedValue(null)

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      expect(lines.at(-1)).toMatchObject({ closetItems: [] })
      // Not signed in means there is no user id to read a wardrobe for —
      // the route must never even attempt the closet read.
      expect(listClosetItemsMock).not.toHaveBeenCalled()
    })

    it('Supabase chưa cấu hình vẫn chạy, không ném lỗi', async () => {
      getCurrentUserIdMock.mockResolvedValue('user-unconfigured')
      createSupabaseServerClientMock.mockResolvedValue(null)

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      expect(lines.at(-1)).toMatchObject({ closetItems: [] })
      expect(listClosetItemsMock).not.toHaveBeenCalled()
    })

    it('đã đăng nhập thì closetItems lấy từ tủ của đúng user đó', async () => {
      const userId = 'user-42'
      getCurrentUserIdMock.mockResolvedValue(userId)
      createSupabaseServerClientMock.mockResolvedValue({})
      listClosetItemsMock.mockResolvedValue([
        {
          id: 'closet-item-1',
          userId,
          name: 'Áo sơ mi trắng của tôi',
          imagePath: `${userId}/ao-so-mi.jpg`,
          category: 'tops',
          colorSlugs: ['trang'],
          styleSlugs: ['minimalist'],
          occasions: ['casual'],
          fit: null,
          attributes: [],
          note: 'Mua năm ngoái',
          labelSource: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ])
      signClosetImageMock.mockResolvedValue('https://signed.example/ao-so-mi.jpg')

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      expect(lines.at(-1)).toMatchObject({
        closetItems: [
          {
            id: 'closet-item-1',
            name: 'Áo sơ mi trắng của tôi',
            image: 'https://signed.example/ao-so-mi.jpg',
            note: 'Mua năm ngoái',
          },
        ],
      })
      expect(listClosetItemsMock).toHaveBeenCalledWith(expect.anything(), userId, expect.objectContaining({ limit: expect.any(Number) }))
    })

    it('lỗi khi đọc tủ đồ không làm hỏng cả request', async () => {
      getCurrentUserIdMock.mockResolvedValue('user-99')
      createSupabaseServerClientMock.mockResolvedValue({})
      listClosetItemsMock.mockRejectedValue(new Error('simulated-closet-read-failure'))

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      expect(lines.map((l) => l.type)).toEqual(['analysis', 'result'])
      expect(lines.at(-1)).toMatchObject({ closetItems: [] })
    })

    // Review finding (IMPORTANT 1): signing happens per item, after
    // ranking — one item's `signClosetImage` throwing outright (a genuine
    // network exception, distinct from the structured error
    // `signClosetImage` already turns into `null` internally) must cost
    // only that item's image, never the item itself and never the rest of
    // the ranked group.
    it('một món ký ảnh lỗi (throw) không làm hỏng món đó hay nhóm còn lại', async () => {
      const userId = 'user-iso'
      getCurrentUserIdMock.mockResolvedValue(userId)
      createSupabaseServerClientMock.mockResolvedValue({})
      listClosetItemsMock.mockResolvedValue([
        {
          id: 'closet-bad',
          userId,
          name: 'Áo lỗi ký ảnh',
          imagePath: `${userId}/bad.jpg`,
          category: 'tops',
          colorSlugs: [],
          styleSlugs: [],
          occasions: ['casual'],
          fit: null,
          attributes: [],
          note: null,
          labelSource: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'closet-good',
          userId,
          name: 'Áo ổn',
          imagePath: `${userId}/good.jpg`,
          category: 'tops',
          colorSlugs: [],
          styleSlugs: [],
          occasions: ['casual'],
          fit: null,
          attributes: [],
          note: null,
          labelSource: 'user',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ])
      signClosetImageMock.mockImplementation(async (path: string) => {
        if (path.includes('bad')) {
          throw new Error('simulated-signing-network-exception')
        }
        return `https://signed.example/${path}`
      })
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      const result = lines.at(-1) as { closetItems: Array<{ id: string; image: string | null }> }

      expect(result.closetItems).toHaveLength(2)
      expect(result.closetItems.find((item) => item.id === 'closet-bad')?.image).toBeNull()
      expect(result.closetItems.find((item) => item.id === 'closet-good')?.image).toBe(
        `https://signed.example/${userId}/good.jpg`,
      )
      expect(errSpy).toHaveBeenCalled()
    })

    // Review finding (IMPORTANT 2): signing must happen only for the
    // entries that survive `rankItems`'s default limit of 5 — not for
    // every row `listClosetItems` returns. A wardrobe with more than 5
    // items proves this directly: `signClosetImageMock` must be called no
    // more times than there are entries in the final `closetItems`.
    it('chỉ ký ảnh cho những món đã qua rank, không ký cả tủ', async () => {
      const userId = 'user-many'
      getCurrentUserIdMock.mockResolvedValue(userId)
      createSupabaseServerClientMock.mockResolvedValue({})
      const manyItems = Array.from({ length: 8 }, (_, index) => ({
        id: `closet-${index}`,
        userId,
        name: `Món ${index}`,
        imagePath: `${userId}/item-${index}.jpg`,
        category: 'tops',
        colorSlugs: [],
        styleSlugs: [],
        occasions: ['casual'],
        fit: null,
        attributes: [],
        note: null,
        labelSource: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
      }))
      listClosetItemsMock.mockResolvedValue(manyItems)
      signClosetImageMock.mockResolvedValue('https://signed.example/item.jpg')

      const res = await POST(formRequest({ answers: validAnswers }))
      expect(res.status).toBe(200)
      const lines = await ndjson(res)
      const result = lines.at(-1) as { closetItems: unknown[] }

      expect(result.closetItems.length).toBeLessThanOrEqual(5)
      expect(result.closetItems.length).toBeGreaterThan(0)
      expect(signClosetImageMock).toHaveBeenCalledTimes(result.closetItems.length)
    })
  })
})
