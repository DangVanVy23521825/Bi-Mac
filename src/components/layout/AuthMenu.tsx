'use client'

// The one sign-in control in the app. Deliberately quiet and typographic
// (docs/06_DESIGN_SYSTEM.md: Bí Mặc is editorial, not a SaaS dashboard) —
// a pill button or a loud CTA here is exactly what drags the header
// toward looking like a product console.
//
// `unconfigured` renders nothing — no disabled button, no placeholder.
// Showing a button that cannot work (no Supabase project wired up) would
// be a worse experience than showing none, and the product rule is that
// the app boots and looks finished with zero Supabase env vars set.
//
// Sign-in needs the browser client (PKCE redirect flow via
// `signInWithOAuth`), so that branch is a client-side click handler.
// Sign-out is a plain `<form method="post">` to `/auth/sign-out` instead
// of another client call — it works even if this component never
// hydrates, and it keeps the only thing that *must* run on the client
// (starting the Google redirect) from spreading into a second case that
// doesn't need to.

import type { AuthState } from '@/features/account/guard'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type AuthMenuProps = {
  authState: AuthState
}

export function AuthMenu({ authState }: AuthMenuProps) {
  if (authState.status === 'unconfigured') return null

  if (authState.status === 'signed-out') {
    const handleSignIn = async () => {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) return

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    }

    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="font-body text-xs uppercase tracking-[0.14em] text-foreground hover:text-accent"
      >
        Đăng nhập bằng Google
      </button>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {authState.displayName && (
        <span className="font-body text-xs text-accent-soft">{authState.displayName}</span>
      )}
      <form action="/auth/sign-out" method="post">
        <button
          type="submit"
          className="font-body text-xs uppercase tracking-[0.14em] text-foreground hover:text-accent"
        >
          Đăng xuất
        </button>
      </form>
    </div>
  )
}
