import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseBrowserClient, upload } = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  upload: vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { AddItemForm } from './AddItemForm'

function validFile(name = 'ao.jpg', type = 'image/jpeg', size = 10) {
  return new File([new Uint8Array(size)], name, { type })
}

const sampleTag = {
  name: 'Áo sơ mi trắng',
  category: 'tops' as const,
  colorSlugs: ['kem'],
  styleSlugs: ['modern-classic'],
  occasions: ['work'] as const,
  fit: 'fitted' as const,
  attributes: [],
  note: null,
}

describe('AddItemForm', () => {
  beforeEach(() => {
    createSupabaseBrowserClient.mockReset()
    upload.mockReset()
    createSupabaseBrowserClient.mockReturnValue({
      storage: { from: () => ({ upload }) },
    })
    upload.mockResolvedValue({ data: { path: 'u1/anh.jpg' }, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag: sampleTag, labelSource: 'ai', degradedReason: null }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('từ chối file vượt MAX_PHOTO_BYTES trước khi upload', async () => {
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const oversized = validFile('anh-lon.jpg', 'image/jpeg', 4_000_001)
    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, oversized)

    expect(screen.getByRole('alert')).toHaveTextContent(/nhỏ hơn/i)
    expect(upload).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('từ chối định dạng ngoài ALLOWED_PHOTO_TYPES', async () => {
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const heic = validFile('anh.heic', 'image/heic', 10)
    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, heic, { applyAccept: false })

    expect(screen.getByRole('alert')).toHaveTextContent(/JPEG, PNG hoặc WebP/i)
    expect(upload).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('hiện form đã điền sẵn sau khi gắn nhãn xong', async () => {
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())

    expect(await screen.findByDisplayValue(sampleTag.name)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lưu vào tủ đồ/i })).toBeInTheDocument()
  })

  it('đổi labelSource sang user khi người dùng sửa một trường', async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: true })
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())

    const nameField = await screen.findByDisplayValue(sampleTag.name)
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Áo sơ mi của tôi')

    await userEvent.click(screen.getByRole('button', { name: /Lưu vào tủ đồ/i }))

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Áo sơ mi của tôi', labelSource: 'user' }),
    )
  })

  it('báo rõ khi gắn nhãn bị suy giảm, vẫn hiện form để người dùng tự điền', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tag: { ...sampleTag, name: 'Món đồ mới', colorSlugs: [], styleSlugs: [], occasions: [], fit: null },
          labelSource: 'ai',
          degradedReason: 'no-key',
        }),
      }),
    )
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())

    expect(await screen.findByText(/tự điền/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Món đồ mới')).toBeInTheDocument()
  })
})
