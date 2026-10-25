import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StylistFlow } from './StylistFlow'

// Builds a `ReadableStream<Uint8Array>` the test controls by hand, so an
// `analysis` NDJSON line can be enqueued while the stream is deliberately
// left open (not closed) — modelling the real gap route.ts's module
// comment describes: the `result` line is written only once the second
// model call resolves, "typically several seconds" later. This is the
// only way to prove `StylistFlow` renders stage 1 *before* stage 2
// arrives, rather than buffering the whole body first.
function createControlledStream() {
  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
    },
  })

  function pushLine(payload: unknown) {
    controllerRef?.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
  }

  function close() {
    controllerRef?.close()
  }

  return { stream, pushLine, close }
}

async function submitQuestionnaire() {
  await userEvent.click(screen.getByLabelText('Đi làm'))
  await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
}

const analysisLine = {
  type: 'analysis' as const,
  styleDirections: [
    {
      slug: 'minimalist',
      name: 'Minimalist',
      affinity: 0.82,
      reason: 'Bạn chọn những món ít chi tiết.',
      href: '/styles/minimalist',
    },
  ],
  palette: [{ slug: 'kem', name: 'Kem', hex: '#F5F0E8', reason: 'Màu nền trung tính.' }],
  notes: [],
  degraded: false,
}

const resultLine = {
  type: 'result' as const,
  outfits: [
    {
      slug: 'modern-classic-di-lam',
      name: 'Modern Classic đi làm',
      image: null,
      whyThisWorks: 'Sơ mi trắng giữ phần trên gọn.',
      items: [{ slug: 'so-mi-trang', name: 'Sơ mi trắng', href: '/wardrobe/tops/so-mi-trang' }],
    },
  ],
  items: [],
  providerId: 'gemini' as const,
  degraded: false,
  degradedReason: null,
}

describe('StylistFlow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('render chặng phân tích ngay khi dòng analysis tới, trước khi dòng result tới', async () => {
    const { stream, pushLine, close } = createControlledStream()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })),
    )

    render(<StylistFlow avoidOptions={[]} />)
    await submitQuestionnaire()

    pushLine(analysisLine)

    await waitFor(() => {
      expect(screen.getByText('Minimalist')).toBeInTheDocument()
      expect(screen.getByText('Kem')).toBeInTheDocument()
    })

    // Dòng result chưa tới và stream chưa đóng — outfit chưa được render.
    expect(screen.queryByText('Modern Classic đi làm')).not.toBeInTheDocument()
    expect(screen.queryByTestId('recommended-outfit-item')).not.toBeInTheDocument()

    pushLine(resultLine)
    close()

    await waitFor(() => {
      expect(screen.getByText('Modern Classic đi làm')).toBeInTheDocument()
    })
    expect(screen.getByTestId('recommended-outfit-item')).toHaveAttribute(
      'href', '/wardrobe/tops/so-mi-trang',
    )
  })

  it('fetch lỗi mạng thì hiện thông báo nói về mạng, kèm link sang /styles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<StylistFlow avoidOptions={[]} />)
    await submitQuestionnaire()

    await waitFor(() => {
      expect(screen.getByText(/mạng chập chờn/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /khám phá theo style/i })).toHaveAttribute(
        'href', '/styles',
      )
    })
  })

  // Trước fix, mọi `!response.ok` — kể cả 413 "ảnh vượt quá dung lượng"
  // và 415 "loại ảnh không được hỗ trợ" từ route.ts — đổ vào cùng một
  // trạng thái 'error' với copy đổ lỗi cho mạng. Hai test dưới khoá từng
  // nhánh HTTP status riêng, để một ảnh bị từ chối không còn bị báo sai
  // thành vấn đề mạng.
  it('ảnh vượt dung lượng (413) hiện đúng lý do, không đổ lỗi cho mạng', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Ảnh vượt quá dung lượng cho phép.' }), {
          status: 413,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    render(<StylistFlow avoidOptions={[]} />)
    await submitQuestionnaire()

    await waitFor(() => {
      expect(screen.getByText(/ảnh nhỏ hơn/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/mạng chập chờn/i)).not.toBeInTheDocument()
  })

  it('loại ảnh không được hỗ trợ (415) hiện đúng lý do, không đổ lỗi cho mạng', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Loại ảnh không được hỗ trợ.' }), {
          status: 415,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    render(<StylistFlow avoidOptions={[]} />)
    await submitQuestionnaire()

    await waitFor(() => {
      expect(screen.getByText(/định dạng ảnh/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/mạng chập chờn/i)).not.toBeInTheDocument()
  })
})
