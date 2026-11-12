'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AuthState } from '@/features/account/guard'
import { AuthMenu } from './AuthMenu'
import { MobileNavigation } from './MobileNavigation'
import { NAV, isActive } from './nav'

type SiteHeaderProps = {
  authState: AuthState
}

export function SiteHeader({ authState }: SiteHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-muted/40 bg-background/95 backdrop-blur-none">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Bí Mặc
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav aria-label="Điều hướng chính">
            <ul className="flex items-center gap-8">
              {NAV.slice(1).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`font-body text-xs uppercase tracking-[0.14em] ${
                      isActive(pathname, item.href)
                        ? 'text-accent'
                        : 'text-foreground hover:text-accent'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <AuthMenu authState={authState} />
        </div>

        <MobileNavigation authState={authState} />
      </div>
    </header>
  )
}
