import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/brand'
import { NAV } from './nav'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-muted/40 px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p className="font-display text-2xl font-semibold">{APP_NAME}</p>
          <p className="mt-1 font-body text-xs uppercase tracking-[0.14em] text-accent-soft">
            {APP_TAGLINE}
          </p>
          <p className="mt-3 font-body text-sm text-accent-soft">
            Từ điển thời trang và cách phối đồ cho phụ nữ Việt.
          </p>
        </div>

        <nav aria-label="Điều hướng chân trang">
          <ul className="space-y-3">
            {NAV.slice(1).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-body text-sm hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="mx-auto mt-12 max-w-6xl font-body text-xs text-accent-soft">
        Hình ảnh trên {APP_NAME} được tạo bằng AI phục vụ mục đích trình bày sản phẩm.
      </p>
    </footer>
  )
}
