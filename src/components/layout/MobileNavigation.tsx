'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NAV, isActive } from './nav'

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the menu on route change. Resetting local UI state (an open
  // overlay) when the route changes is the intended use case here; there
  // is no external-system subscription to model this as instead.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="font-body text-xs uppercase tracking-[0.18em]"
      >
        {open ? 'Đóng' : 'Menu'}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Điều hướng chính"
          className="fixed inset-0 top-16 z-50 bg-background px-6 pt-10"
        >
          <ul className="space-y-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`font-display text-3xl ${
                    isActive(pathname, item.href) ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
