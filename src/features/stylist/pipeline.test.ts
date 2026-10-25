import { describe, expect, it } from 'vitest'
import { allColors, allItems, allOutfits, allStyles } from '@/data'
import { createDeterministicProvider } from '@/lib/ai/deterministic'
import type { AnalyzeRequest, ExplainRequest, StylistProvider } from '@/lib/ai/provider'
import type { StylistCatalog } from '@/features/stylist/resolve'
import type { StylistInput } from '@/features/stylist/input'
import { runStylist, type StylistDeps } from '@/features/stylist/pipeline'

const catalog: StylistCatalog = {
  items: allItems,
  outfits: allOutfits,
  styles: allStyles,
  colors: allColors,
}

const input: StylistInput = {
  answers: {
    occasions: ['work', 'casual'],
    fitPreference: 'unsure',
    avoids: [],
    goal: 'outfits',
  },
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    // Don't let this timer keep the test process alive past the run.
    timer.unref?.()
  })
}

// okProvider — a well-behaved "gemini" stand-in. Returns real catalog slugs
// so resolveAnalysis/rankOutfits have something to work with, and explains
// exactly the outfits it is asked about.
const okProvider: StylistProvider = {
  id: 'gemini',
  async analyze() {
    return {
      styleDirections: [
        { styleSlug: 'minimalist', affinity: 0.9, reason: 'Khớp với tông tối giản bạn chọn.' },
        { styleSlug: 'quiet-luxury', affinity: 0.6, reason: 'Phù hợp dịp công sở.' },
      ],
      palette: [
        { colorSlug: 'kem', reason: 'Tông nền trung tính.' },
        { colorSlug: 'chocolate', reason: 'Điểm neo ấm.' },
      ],
      notes: ['Phân tích từ provider chính.'],
    }
  },
  async explain(req: ExplainRequest) {
    return {
      outfits: req.outfits.map((outfit) => ({
        outfitSlug: outfit.slug,
        whyThisWorks: `Lý do AI cho ${outfit.name}.`,
      })),
    }
  },
}

const throwingProvider: StylistProvider = {
  id: 'gemini',
  async analyze() {
    throw new Error('provider chính lỗi')
  },
  async explain() {
    throw new Error('không bao giờ được gọi')
  },
}

const slowProvider: StylistProvider = {
  id: 'gemini',
  async analyze(req: AnalyzeRequest) {
    await delay(60)
    return okProvider.analyze(req)
  },
  async explain(req: ExplainRequest) {
    return okProvider.explain(req)
  },
}

const hallucinatingProvider: StylistProvider = {
  id: 'gemini',
  async analyze() {
    return {
      styleDirections: [
        { styleSlug: 'dark-academia', affinity: 0.95, reason: 'Style bịa ra.' },
        { styleSlug: 'minimalist', affinity: 0.5, reason: 'Style thật.' },
      ],
      palette: [{ colorSlug: 'kem', reason: 'Thật.' }],
      notes: ['Ghi chú.'],
    }
  },
  async explain(req: ExplainRequest) {
    return okProvider.explain(req)
  },
}

const emptyAnalysisProvider: StylistProvider = {
  id: 'gemini',
  async analyze() {
    return { styleDirections: [], palette: [], notes: [] }
  },
  async explain(req: ExplainRequest) {
    return okProvider.explain(req)
  },
}

// strayExplainProvider — analyzes normally, but its `explain` answers about
// an outfit slug nobody asked about ('khong-duoc-hoi') and nothing else.
const strayExplainProvider: StylistProvider = {
  id: 'gemini',
  async analyze(req: AnalyzeRequest) {
    return okProvider.analyze(req)
  },
  async explain() {
    return {
      outfits: [{ outfitSlug: 'khong-duoc-hoi', whyThisWorks: 'Lời giải thích cho outfit không tồn tại.' }],
    }
  },
}

// partialExplainProvider — only explains the first ranked outfit it is
// asked about; the rest must fall back to the catalog's own whyItWorks.
const partialExplainProvider: StylistProvider = {
  id: 'gemini',
  async analyze(req: AnalyzeRequest) {
    return okProvider.analyze(req)
  },
  async explain(req: ExplainRequest) {
    const first = req.outfits[0]
    if (!first) return { outfits: [] }
    return { outfits: [{ outfitSlug: first.slug, whyThisWorks: `Giải thích AI cho ${first.name}.` }] }
  },
}

const explainThrowsProvider: StylistProvider = {
  id: 'gemini',
  async analyze(req: AnalyzeRequest) {
    return okProvider.analyze(req)
  },
  async explain() {
    throw new Error('explain lỗi')
  },
}

const fallback = createDeterministicProvider()

const deps: StylistDeps = {
  primary: okProvider,
  fallback,
  catalog,
}

describe('runStylist', () => {
  it('dùng provider chính khi nó chạy được', async () => {
    const outcome = await runStylist(input, { ...deps, primary: okProvider })
    expect(outcome.providerId).toBe('gemini')
    expect(outcome.degraded).toBe(false)
  })

  it('chuyển sang fallback khi provider chính throw', async () => {
    const outcome = await runStylist(input, { ...deps, primary: throwingProvider })
    expect(outcome.providerId).toBe('deterministic')
    expect(outcome.degraded).toBe(true)
    expect(outcome.degradedReason).toBe('provider-error')
  })

  it('chuyển sang fallback khi provider chính quá hạn', async () => {
    const outcome = await runStylist(input, { ...deps, primary: slowProvider, timeoutMs: 20 })
    expect(outcome.degradedReason).toBe('timeout')
  })

  it('dùng fallback khi không có provider chính', async () => {
    const outcome = await runStylist(input, { ...deps, primary: null })
    expect(outcome.degradedReason).toBe('no-key')
  })

  it('mọi href trong kết quả trỏ tới route thật', async () => {
    const outcome = await runStylist(input, deps)
    for (const d of outcome.styleDirections) expect(d.href).toMatch(/^\/styles\/[a-z-]+$/)
    for (const i of outcome.items) expect(i.href).toMatch(/^\/wardrobe\/[a-z]+\/[a-z0-9-]+$/)
    for (const o of outcome.outfits) {
      for (const i of o.items) expect(i.href).toMatch(/^\/wardrobe\/[a-z]+\/[a-z0-9-]+$/)
    }
  })

  it('không bao giờ render style LLM bịa ra', async () => {
    const outcome = await runStylist(input, { ...deps, primary: hallucinatingProvider })
    expect(outcome.styleDirections.map((d) => d.slug)).not.toContain('dark-academia')
  })

  it('analysis rỗng vẫn trả outcome có ghi chú, không rỗng hoàn toàn', async () => {
    const outcome = await runStylist(input, { ...deps, primary: emptyAnalysisProvider })
    expect(outcome.styleDirections).toEqual([])
    expect(outcome.notes.length).toBeGreaterThan(0)
  })

  it('bỏ lời giải thích cho outfit không nằm trong danh sách đã chọn', async () => {
    const outcome = await runStylist(input, { ...deps, primary: strayExplainProvider })
    const slugs = new Set(outcome.outfits.map((o) => o.slug))
    expect(slugs.has('khong-duoc-hoi')).toBe(false)
    for (const o of outcome.outfits) expect(o.whyThisWorks.length).toBeGreaterThan(0)
  })

  it('outfit thiếu lời giải thích thì dùng whyItWorks của catalog', async () => {
    const outcome = await runStylist(input, { ...deps, primary: partialExplainProvider })
    for (const o of outcome.outfits) expect(o.whyThisWorks.length).toBeGreaterThan(0)
  })

  it('explain lỗi thì vẫn trả outfit, chỉ hạ cấp lời giải thích', async () => {
    const outcome = await runStylist(input, { ...deps, primary: explainThrowsProvider })
    expect(outcome.outfits.length).toBeGreaterThan(0)
    expect(outcome.degraded).toBe(true)
  })

  it('avoid loại hết thì trả outfit rỗng kèm ghi chú', async () => {
    const outcome = await runStylist(
      { ...input, answers: { ...input.answers, occasions: ['date'], avoids: ['sleeveless', 'clingy', 'sheer'] } },
      deps,
    )
    expect(outcome.outfits).toEqual([])
    expect(outcome.notes.join(' ')).toMatch(/tránh/i)
  })
})
