// `/closet/styles` — những style của Bí Mặc mà người dùng đã lưu, từ nút
// lưu trên trang `/styles/[slug]`. Cùng ranh giới `(account)` (ADR-021)
// với `/closet/items` và `/closet/looks`.
//
// Bố cục zig-zag ảnh/chữ mượn nguyên từ `/styles/page.tsx` (danh sách đầy
// đủ năm style) — cùng nội dung hiển thị, chỉ khác tập style được lọc
// theo người dùng, nên không đáng để bày thêm một component thẻ style
// mới chỉ dùng ở đây.
import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { requireUserId } from '@/features/account/guard'
import { listSavedStyles } from '@/features/closet/saved'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function SavedStylesPage() {
  const userId = await requireUserId()
  const supabase = await createSupabaseServerClient()

  const styles = supabase ? await listSavedStyles(supabase, userId) : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Những style đã lưu" />
      {styles.length === 0 ? (
        <p className="max-w-xl font-body text-base text-accent-soft">
          Bạn chưa lưu style nào. Khám phá{' '}
          <Link href="/styles" className="underline underline-offset-4 hover:text-accent">
            năm hướng style
          </Link>{' '}
          của Bí Mặc và lưu lại hướng hợp với bạn.
        </p>
      ) : (
        <div className="mt-8 space-y-16">
          {styles.map((style) => (
            <article key={style.slug} className="grid gap-6 sm:grid-cols-5 sm:items-center">
              <div className="sm:col-span-2">
                <EditorialImage src={style.image} alt={style.name} ratio="look" />
              </div>
              <div className="sm:col-span-3">
                <Link href={`/styles/${style.slug}`} className="group block">
                  <h3 className="font-display text-3xl group-hover:text-accent">{style.name}</h3>
                  <p className="mt-3 max-w-md font-body text-base text-accent-soft">{style.tagline}</p>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
