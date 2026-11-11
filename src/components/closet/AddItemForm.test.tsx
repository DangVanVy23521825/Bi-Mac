import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseBrowserClient, upload, remove } = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
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
    remove.mockReset()
    createSupabaseBrowserClient.mockReturnValue({
      storage: { from: () => ({ upload, remove }) },
    })
    upload.mockResolvedValue({ data: { path: 'u1/anh.jpg' }, error: null })
    remove.mockResolvedValue({ data: [], error: null })

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

  it('upload lên bucket lỗi thì báo lỗi, không hiện form đã điền', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'storage down' } })
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không tải được ảnh lên/i)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Lưu vào tủ đồ/i })).not.toBeInTheDocument()
  })

  // Khoá lại guard thêm trong self-review: route /api/closet/tag lúc
  // thành công luôn 200; một status khác (401 phiên hết hạn giữa chừng,
  // 5xx…) có thân JSON khác hình dạng `TagResponseBody` và trước fix sẽ
  // bị spread thẳng vào draft rồi làm vỡ `ClosetLabelFields` khi nó gọi
  // `.includes()` trên field `undefined`. Test này xác nhận route trả về
  // không-200 chỉ báo lỗi chung, không vỡ form.
  it('/api/closet/tag trả về khác 200 thì báo lỗi chung, không vỡ form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Cần đăng nhập để dùng chức năng này.' }) }),
    )
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(/Có lỗi khi xử lý ảnh/i)
    expect(screen.queryByRole('button', { name: /Lưu vào tủ đồ/i })).not.toBeInTheDocument()
  })

  // Quyết định #4 trong review: chọn ảnh khác thay cho ảnh đang chờ lưu
  // (đã lên bucket nhưng chưa có dòng DB nào trỏ tới) phải xoá ảnh cũ —
  // nếu không, mỗi lần đổi ý trước khi lưu là một món rò rỉ vĩnh viễn
  // trong bucket riêng tư.
  it('chọn ảnh khác thay cho ảnh đang chờ lưu thì xoá ảnh cũ khỏi bucket', async () => {
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile('anh-1.jpg'))
    await screen.findByDisplayValue(sampleTag.name)

    const firstPath = upload.mock.calls[0]?.[0] as string
    expect(remove).not.toHaveBeenCalled()

    await userEvent.upload(input, validFile('anh-2.jpg'))
    await screen.findByDisplayValue(sampleTag.name)

    expect(remove).toHaveBeenCalledWith([firstPath])
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('bấm Huỷ thì xoá ảnh đang chờ lưu khỏi bucket và ẩn form đã điền', async () => {
    const onCreate = vi.fn()
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())
    await screen.findByDisplayValue(sampleTag.name)
    const uploadedPath = upload.mock.calls[0]?.[0] as string

    await userEvent.click(screen.getByRole('button', { name: /^Huỷ$/i }))

    expect(remove).toHaveBeenCalledWith([uploadedPath])
    expect(screen.queryByDisplayValue(sampleTag.name)).not.toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  // Review toàn nhánh: `handleSubmit` không bọc `await onCreate(draft)`
  // trong try/catch, nên một rejection bỏ luôn `setSavePending(false)` —
  // nút submit nằm lại ở "Đang lưu…" và disabled vĩnh viễn, không một dòng
  // lỗi nào hiện ra, và nước duy nhất còn lại của người dùng là tải lại
  // trang (mất luôn cơ hội dọn ảnh đang treo). Server Action là một lượt
  // gọi mạng, nên nó reject thật — mất kết nối giữa lúc bấm là đủ.
  it('onCreate reject thì mở lại nút Lưu và báo lỗi, không treo ở "Đang lưu…"', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('mất kết nối'))
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())
    await screen.findByDisplayValue(sampleTag.name)

    await userEvent.click(screen.getByRole('button', { name: /Lưu vào tủ đồ/i }))

    const saveButton = await screen.findByRole('button', { name: /Lưu vào tủ đồ/i })
    expect(saveButton).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Đang lưu/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/thử lại/i)

    // Form vẫn còn đó với nhãn đã điền: người dùng bấm Lưu lại được ngay,
    // và ảnh đang treo vẫn thuộc về draft này nên "Huỷ" vẫn dọn được nó.
    expect(screen.getByDisplayValue(sampleTag.name)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
  })

  it('lưu thành công thì KHÔNG xoá ảnh khỏi bucket — ảnh giờ thuộc về món đã lưu', async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: true })
    render(<AddItemForm userId="u1" onCreate={onCreate} />)

    const input = screen.getByLabelText(/Chụp hoặc chọn ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile())
    await screen.findByDisplayValue(sampleTag.name)

    await userEvent.click(screen.getByRole('button', { name: /Lưu vào tủ đồ/i }))

    expect(onCreate).toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
})
