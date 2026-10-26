import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  // Trước fix, Questionnaire không kiểm size/type nào — một ảnh HEIC hay
  // một ảnh điện thoại bình thường quá 4MB đều lọt qua form, lên server
  // mới bị 415/413, và StylistFlow khi đó báo chung thành lỗi mạng. Hai
  // test dưới khoá việc Questionnaire tự chặn trước khi gửi đi.
  it('từ chối ảnh sai định dạng ngay trên form, nói rõ cần đổi sang JPEG/PNG/WebP', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)

    // `accept` trên input lọc hộp thoại chọn file của hệ điều hành, nhưng
    // không phải mọi hệ điều hành/trình duyệt chặn được 100% — người dùng
    // vẫn có thể chọn "tất cả file" hoặc OS báo sai mediaType. `applyAccept:
    // false` mô phỏng đúng trường hợp đó để test bám vào validation thật
    // trong `handlePhotoChange`, không bám vào bộ lọc `accept` của jsdom.
    const heicFile = new File([new Uint8Array(10)], 'anh.heic', { type: 'image/heic' })
    const input = screen.getByLabelText(/Thêm một ảnh/i) as HTMLInputElement
    await userEvent.upload(input, heicFile, { applyAccept: false })

    expect(screen.getByRole('alert')).toHaveTextContent(/JPEG, PNG hoặc WebP/i)
    expect(input.files?.length ?? 0).toBe(0)

    await userEvent.click(screen.getByLabelText('Đi làm'))
    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
    const call = onSubmit.mock.calls[0] as [{ answers: unknown; photo?: File }] | undefined
    expect(call?.[0].photo).toBeUndefined()
  })

  it('từ chối ảnh vượt dung lượng cho phép ngay trên form, nói rõ cần chọn ảnh nhỏ hơn', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)

    const oversizedFile = new File([new Uint8Array(4_000_001)], 'anh-lon.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/Thêm một ảnh/i) as HTMLInputElement
    await userEvent.upload(input, oversizedFile)

    expect(screen.getByRole('alert')).toHaveTextContent(/nhỏ hơn/i)
    expect(input.files?.length ?? 0).toBe(0)
  })

  it('ảnh hợp lệ thì không hiện cảnh báo và được gửi kèm', async () => {
    const onSubmit = vi.fn()
    render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)

    const validFile = new File([new Uint8Array(10)], 'anh.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/Thêm một ảnh/i) as HTMLInputElement
    await userEvent.upload(input, validFile)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Đi làm'))
    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
    const call = onSubmit.mock.calls[0] as [{ answers: unknown; photo?: File }] | undefined
    expect(call?.[0].photo?.name).toBe('anh.jpg')
  })

  // jsdom không cài `URL.createObjectURL`, nên bản xem trước phải tự chịu
  // được việc API đó vắng mặt (xem guard trong `Questionnaire`). Test nào
  // cần thumbnail thật thì tự cắm stub, rồi gỡ ngay sau đó để không rò
  // sang test khác trong cùng file.
  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  })

  // Trước fix, ô chọn ảnh là `<input type="file">` trần: Tailwind preflight
  // xoá viền/padding của `::file-selector-button` nên nút "Chọn tệp" render
  // thành chữ đen trơn, không ai nhận ra là nút bấm. Nút thật bây giờ là
  // một `<label>` có chữ của Bí Mặc, trỏ vào input bị ẩn khỏi mắt thường.
  it('nút chọn ảnh là một control bấm được, có chữ của Bí Mặc', () => {
    render(<Questionnaire avoidOptions={[]} onSubmit={vi.fn()} pending={false} />)
    const input = screen.getByLabelText(/Thêm một ảnh/i)
    expect(input).toHaveAttribute('type', 'file')
    expect(document.querySelector(`label[for="${input.id}"]`)).toHaveTextContent(/Thêm một ảnh/i)
  })

  it('ảnh hợp lệ thì hiện thumbnail xem trước, bỏ ảnh thì thu hồi object URL', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:xem-truoc')
    const revokeObjectURL = vi.fn()
    URL.revokeObjectURL = revokeObjectURL

    render(<Questionnaire avoidOptions={[]} onSubmit={vi.fn()} pending={false} />)
    const validFile = new File([new Uint8Array(10)], 'anh.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/Thêm một ảnh/i), validFile)

    const preview = await screen.findByRole('img', { name: /anh\.jpg/i })
    expect(preview).toHaveAttribute('src', 'blob:xem-truoc')

    await userEvent.click(screen.getByRole('button', { name: /Bỏ ảnh/ }))
    expect(screen.queryByRole('img', { name: /anh\.jpg/i })).not.toBeInTheDocument()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:xem-truoc')
  })
})
