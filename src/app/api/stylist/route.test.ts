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
import { describe, expect, it, vi } from 'vitest'
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
})
