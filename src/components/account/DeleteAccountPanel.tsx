'use client'

// Màn hình rời đi. Đây là chỗ sản phẩm dễ trở nên xấu xí và doạ nạt nhất —
// khung đỏ, dấu chấm than, chữ "DANGER ZONE" — nên nó cố tình giữ đúng nhịp
// biên tập của phần còn lại: chữ serif, nhiều khoảng trắng, không viền cảnh
// báo, không icon. Nói thẳng chuyện gì sẽ xảy ra, rồi để người ta tự quyết.
// Một người muốn rời đi không cần bị thuyết phục ở lại bằng cách làm cho
// cái nút khó chịu.
//
// Hai lớp chống bấm nhầm, và cả hai đều cần thiết:
//   1. Bước xác nhận chỉ hiện ra sau khi bấm "Xoá tài khoản" — cái nút đầu
//      tiên không xoá gì cả, nó chỉ mở ra phần giải thích.
//   2. Nút xoá thật bị khoá cho tới khi gõ đúng một từ. Không phải checkbox:
//      checkbox bấm nhầm được, gõ một từ thì không.
//
// Một chữ về câu "chúng tôi không giữ lại bản sao nào để dùng về sau":
// nó cố tình **không** phải "không có bản sao nào được giữ lại". Lời thứ hai
// là một khẳng định về hạ tầng — PITR của Postgres, bản backup, retention
// của Storage — mà code ở đây không hứa thay được, và
// `docs/07_SECURITY_PRIVACY.md` là tài liệu chi phối màn hình này. Một lời
// hứa riêng tư mà hệ thống không giữ được thì tệ hơn một lời hứa hẹp mà
// đúng. Đừng "làm cho nó mạnh hơn".
//
// Từ xác nhận được so sau khi bỏ dấu và viết hoa (`XOÁ`, `xoa`, `Xóa` đều
// được tính). Bắt gõ đúng dấu bằng một bộ gõ tiếng Việt là dựng rào với
// chính người dùng chứ không phải với cú bấm nhầm — mà cú bấm nhầm thì đã
// bị chặn bởi việc phải gõ ba chữ cái rồi.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONFIRM_WORD = 'XOÁ'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

const CONFIRM_TARGET = normalize(CONFIRM_WORD)

const UNEXPECTED_ERROR = 'Chưa xoá được tài khoản. Vui lòng thử lại sau ít phút.'

export function DeleteAccountPanel() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const canDelete = normalize(typed) === CONFIRM_TARGET && !pending

  function cancel() {
    setConfirming(false)
    setTyped('')
    setError(undefined)
  }

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canDelete) return

    setError(undefined)
    setPending(true)

    let response: Response
    try {
      // Không gửi body: route lấy id từ session. Xem comment đầu
      // `src/app/api/account/route.ts` — gửi id từ đây là tự tạo ra đúng
      // thứ tham số mà route phải từ chối.
      response = await fetch('/api/account', { method: 'DELETE' })
    } catch {
      setPending(false)
      setError(UNEXPECTED_ERROR)
      return
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      setPending(false)
      setError(body?.error ?? UNEXPECTED_ERROR)
      return
    }

    // Không gỡ `pending`: từ đây trở đi màn hình chỉ còn chờ chuyển trang,
    // và không còn tài khoản nào để bấm thêm lần nữa.
    router.replace('/')
    router.refresh()
  }

  if (!confirming) {
    return (
      <div className="max-w-xl space-y-6">
        <p className="font-body text-base text-accent-soft">
          Bạn có thể rời khỏi Bí Mặc bất cứ lúc nào. Khi bạn xoá tài khoản, chúng tôi xoá thật:
          toàn bộ ảnh quần áo bạn đã tải lên, những món và look bạn đã lưu, cùng mọi câu trả lời
          bạn từng đưa cho AI phối đồ. Chúng tôi không giữ lại bản sao nào để dùng về sau.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-body text-sm text-accent underline underline-offset-4 hover:text-accent-soft"
        >
          Xoá tài khoản
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleDelete} className="max-w-xl space-y-6 border border-muted/50 p-6">
      <p className="font-body text-base">
        Thao tác này <strong className="font-semibold">không thể hoàn tác</strong>. Ảnh và dữ liệu
        của bạn sẽ bị xoá vĩnh viễn, không có cách nào khôi phục lại — kể cả khi bạn đăng nhập lại
        bằng chính tài khoản Google đó.
      </p>

      <div className="space-y-2">
        <label htmlFor="xac-nhan-xoa" className="block font-body text-sm text-accent-soft">
          Nhập “{CONFIRM_WORD}” để xác nhận
        </label>
        <input
          id="xac-nhan-xoa"
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="w-40 border border-muted/60 bg-transparent px-3 py-2 font-body text-sm tracking-[0.12em] focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={!canDelete}
          className="border border-accent bg-accent px-6 py-2.5 font-body text-xs uppercase tracking-[0.14em] text-ivory transition hover:bg-accent-soft hover:border-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Đang xoá…' : 'Xoá vĩnh viễn tài khoản'}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="font-body text-xs uppercase tracking-[0.14em] text-accent-soft underline underline-offset-4 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Giữ lại tài khoản
        </button>
      </div>
    </form>
  )
}
