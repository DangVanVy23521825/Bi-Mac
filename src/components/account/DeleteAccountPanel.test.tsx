// Yêu cầu của task nói rõ: bước xác nhận phải *không thể bấm nhầm*. Đó là
// một hành vi, không phải một đoạn copy — nên nó có test. Mỗi test dưới đây
// hỏng nếu một trong hai lớp chống bấm nhầm bị gỡ.

import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }))

import { DeleteAccountPanel } from './DeleteAccountPanel'

function mockFetch(response: Partial<Response> & { ok: boolean; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function confirmButton() {
  return screen.getByRole('button', { name: /xoá vĩnh viễn tài khoản/i })
}

describe('DeleteAccountPanel', () => {
  beforeEach(() => {
    replace.mockReset()
    refresh.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('nút đầu tiên chỉ mở bước xác nhận, không xoá gì', async () => {
    const fetchMock = mockFetch({ ok: true })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)

    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/nhập/i)).toBeInTheDocument()
  })

  it('nói rõ không thể hoàn tác', async () => {
    mockFetch({ ok: true })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)

    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))

    expect(screen.getByText(/không thể hoàn tác/i)).toBeInTheDocument()
  })

  it('nút xoá bị khoá cho tới khi gõ đúng từ xác nhận', async () => {
    const fetchMock = mockFetch({ ok: true })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)
    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))

    expect(confirmButton()).toBeDisabled()

    await user.type(screen.getByLabelText(/nhập/i), 'xong')
    expect(confirmButton()).toBeDisabled()

    // Bấm vào nút đang khoá cũng không gọi được API.
    await user.click(confirmButton())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gõ đúng từ (không cần dấu, không phân biệt hoa thường) thì xoá được', async () => {
    const fetchMock = mockFetch({ ok: true })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)
    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))

    await user.type(screen.getByLabelText(/nhập/i), 'xoa')
    expect(confirmButton()).toBeEnabled()

    await user.click(confirmButton())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/account')
    expect(init.method).toBe('DELETE')
    // Không gửi body: id do session quyết định, không do client.
    expect(init.body).toBeUndefined()
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('hiện nguyên thông điệp của máy chủ khi xoá thất bại và không chuyển trang', async () => {
    const message = 'Chưa xoá được ảnh trong tủ đồ nên tài khoản của bạn vẫn còn nguyên. Vui lòng thử lại.'
    mockFetch({ ok: false, json: async () => ({ error: message }) })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)
    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))
    await user.type(screen.getByLabelText(/nhập/i), 'XOÁ')

    await user.click(confirmButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(replace).not.toHaveBeenCalled()
  })

  it('quay lại được mà không xoá gì', async () => {
    const fetchMock = mockFetch({ ok: true })
    const user = userEvent.setup()
    render(<DeleteAccountPanel />)
    await user.click(screen.getByRole('button', { name: 'Xoá tài khoản' }))

    await user.click(screen.getByRole('button', { name: 'Giữ lại tài khoản' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/nhập/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xoá tài khoản' })).toBeInTheDocument()
  })
})
