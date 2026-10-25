import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Questionnaire } from './Questionnaire'

describe('Questionnaire', () => {
  it('chỉ hiện lựa chọn tránh mà catalog tôn trọng được', () => {
    render(<Questionnaire avoidOptions={['sheer', 'sleeveless']} onSubmit={vi.fn()} pending={false} />)
    expect(screen.getByLabelText(/Chất liệu mỏng/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Cao gót/)).not.toBeInTheDocument()
  })

  it('không gửi khi chưa chọn dịp mặc nào', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/dịp mặc/i)
  })

  it('gửi đúng answers đã chọn', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={['sheer']} onSubmit={onSubmit} pending={false} />)
    await userEvent.click(screen.getByLabelText('Đi làm'))
    await userEvent.click(screen.getByLabelText(/Chất liệu mỏng/))
    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      answers: expect.objectContaining({ occasions: ['work'], avoids: ['sheer'] }),
    }))
  })

  it('có dòng disclosure về ảnh ngay cạnh ô chọn ảnh', () => {
    render(<Questionnaire avoidOptions={[]} onSubmit={vi.fn()} pending={false} />)
    expect(screen.getByText(/gửi tới Google.*không được lưu/i)).toBeInTheDocument()
  })

  it('ảnh là tuỳ chọn, bỏ ảnh ra vẫn gửi được', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)
    await userEvent.click(screen.getByLabelText('Đi làm'))
    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
    const call = onSubmit.mock.calls[0] as [{ answers: unknown; photo?: File }] | undefined
    expect(call?.[0].photo).toBeUndefined()
  })
})
