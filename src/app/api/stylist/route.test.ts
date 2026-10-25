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
})
