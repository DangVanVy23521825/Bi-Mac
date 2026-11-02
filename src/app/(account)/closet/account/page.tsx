// `/closet/account` — trang tài khoản, hiện chỉ có một việc: đường ra.
//
// Nằm trong route group `(account)` (ADR-021) nên hai trạng thái
// unconfigured/signed-out đã do `layout.tsx` lo; trang chỉ phục vụ người đã
// đăng nhập. Vẫn tự gọi `requireUserId()` như `/closet/items`: cổng của
// layout là ranh giới UI, không phải ranh giới dữ liệu.
//
// Trang không nhận, không hiển thị và không truyền đi `userId` — phần xoá
// chạy qua `DELETE /api/account`, nơi id được lấy lại từ session. Một id
// đi vòng qua client là đúng thứ mà route đó phải từ chối (service role bỏ
// qua RLS, xem comment đầu file route), nên nó không bao giờ được rời khỏi
// server ngay từ đây.

import { DeleteAccountPanel } from '@/components/account/DeleteAccountPanel'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { requireUserId } from '@/features/account/guard'

export default async function AccountPage() {
  await requireUserId()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Tài khoản" title="Rời khỏi Bí Mặc" />
      <DeleteAccountPanel />
    </div>
  )
}
