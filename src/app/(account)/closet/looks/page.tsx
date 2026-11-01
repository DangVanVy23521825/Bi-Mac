// `/closet/looks` — những look (outfit) của Bí Mặc mà người dùng đã lưu.
// Trong route group `(account)` (ADR-021) nên nhánh signed-out/unconfigured
// đã được `layout.tsx` xử lý ở phía trên; trang chỉ cần lo phần của người
// đã đăng nhập, nhưng vẫn tự gọi `requireUserId()` — gate của layout chỉ
// là ranh giới UI, không phải ranh giới dữ liệu (ADR-021).
//
// Không có trang này KHÔNG lưu được một outfit từ task này: chưa có route
// chi tiết nào cho outfit (`docs/02` chỉ có `/wardrobe/[slug]` và
// `/styles/[slug]`), nên danh sách này thường sẽ trống cho tới khi một
// task sau thêm được một control lưu outfit ở đâu đó. Không phải lỗi —
// `listSavedOutfits` vẫn đúng, chỉ chưa có gì để lưu vào nó.
import Link from 'next/link'
import { OutfitLook } from '@/components/editorial/OutfitLook'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { requireUserId } from '@/features/account/guard'
import { listSavedOutfits } from '@/features/closet/saved'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function SavedLooksPage() {
  const userId = await requireUserId()
  const supabase = await createSupabaseServerClient()

  const outfits = supabase ? await listSavedOutfits(supabase, userId) : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Những look đã lưu" />
      {outfits.length === 0 ? (
        <p className="max-w-xl font-body text-base text-accent-soft">
          Bạn chưa lưu look nào. Ghé qua từng style trong{' '}
          <Link href="/styles" className="underline underline-offset-4 hover:text-accent">
            Phối theo style
          </Link>{' '}
          để tìm một bộ hợp với bạn.
        </p>
      ) : (
        <div className="mt-8 space-y-16">
          {outfits.map((outfit) => (
            <OutfitLook key={outfit.slug} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  )
}
