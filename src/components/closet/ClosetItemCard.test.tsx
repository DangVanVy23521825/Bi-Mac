import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { ClosetItemCard } from './ClosetItemCard'
import type { ClosetItem } from '@/types/closet'

const item: ClosetItem = {
  id: 'item-1',
  userId: 'u1',
  name: 'Áo sơ mi trắng',
  imagePath: 'u1/raw-path-ao.jpg',
  category: 'tops',
  colorSlugs: ['kem'],
  styleSlugs: ['modern-classic'],
  occasions: ['work'],
  fit: 'fitted',
  attributes: [],
  note: null,
  labelSource: 'ai',
  createdAt: '2026-10-01T00:00:00.000Z',
}

describe('ClosetItemCard', () => {
  it('hiện ảnh bằng signed URL, không bằng đường dẫn thô', () => {
    const signedUrl = 'https://supabase.example.com/storage/v1/object/sign/closet/u1/raw-path-ao.jpg?token=abc'
    render(
      <ClosetItemCard item={item} imageUrl={signedUrl} index={0} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    )

    const image = screen.getByRole('img', { name: item.name })
    expect(image).toHaveAttribute('src', signedUrl)
    expect(image.getAttribute('src')).not.toBe(item.imagePath)
  })

  it('hỏi xác nhận trước khi xoá', async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ClosetItemCard
        item={item}
        imageUrl="https://example.com/signed.jpg"
        index={0}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^Xoá$/i }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText(/Xoá.*khỏi tủ đồ/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/i }))
    expect(onDelete).toHaveBeenCalledWith(item.id)
  })

  // Trước fix, nhánh thất bại của `handleConfirmDelete` gọi
  // `setConfirmingDelete(false)` cùng lúc với `setError(...)` — khối xác
  // nhận (nơi duy nhất render `error`) đóng lại ngay nên lỗi không bao giờ
  // lên màn hình, coi như xoá thất bại mà im lặng quay về hàng bình
  // thường. Test này khoá lại: lỗi phải thấy được, và khối xác nhận phải
  // còn đó để người dùng thử lại hoặc huỷ.
  it('xoá thất bại thì hiện lỗi, không âm thầm quay về trạng thái bình thường', async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: false, error: 'Không thể xoá món đồ này. Vui lòng thử lại.' })
    render(
      <ClosetItemCard
        item={item}
        imageUrl="https://example.com/signed.jpg"
        index={0}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^Xoá$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không thể xoá/i)
    // Khối xác nhận còn đó — nút "Xác nhận xoá" vẫn hiện, không bị thay
    // bằng hàng "Sửa nhãn / Xoá" bình thường.
    expect(screen.getByRole('button', { name: /Xác nhận xoá/i })).toBeInTheDocument()
  })

  it('sửa nhãn: chỉnh tên rồi Lưu gửi đúng draft đã sửa với labelSource "user"', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ClosetItemCard
        item={item}
        imageUrl="https://example.com/signed.jpg"
        index={0}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Sửa nhãn/i }))

    const nameField = screen.getByDisplayValue(item.name)
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Áo sơ mi trắng (đã sửa)')

    await userEvent.click(screen.getByRole('button', { name: /^Lưu$/i }))

    expect(onUpdate).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ name: 'Áo sơ mi trắng (đã sửa)', labelSource: 'user' }),
    )
    // Lưu xong thì thoát khỏi chế độ sửa — quay lại hàng bình thường, có
    // lại nút "Sửa nhãn".
    expect(await screen.findByRole('button', { name: /Sửa nhãn/i })).toBeInTheDocument()
  })

  it('Huỷ khi đang sửa thì không gọi onUpdate và quay lại trạng thái xem bình thường', async () => {
    const onUpdate = vi.fn()
    render(
      <ClosetItemCard
        item={item}
        imageUrl="https://example.com/signed.jpg"
        index={0}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Sửa nhãn/i }))

    const nameField = screen.getByDisplayValue(item.name)
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Tên bị đổi nhưng không lưu')

    await userEvent.click(screen.getByRole('button', { name: /^Huỷ$/i }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Sửa nhãn/i })).toBeInTheDocument()
    expect(screen.getByText(item.name)).toBeInTheDocument()
  })
})
