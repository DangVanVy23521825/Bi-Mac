// Structural half of the route boundary (`src/proxy.ts` is the other
// half — see that file's comment for why one mechanism doesn't cover
// both page and API trees).
//
// Everything under `/closet` lives in this `(account)` route group —
// right now just `(account)/closet/page.tsx`, and every future page this
// product adds under `/closet` (`/closet/items`, `/closet/looks`,
// `/closet/styles` per docs/02) belongs here too, for exactly one reason:
// this file is the one place that decides what a non-signed-in visitor
// sees, so a future page cannot ship *without* that decision the way
// `src/app/closet/page.tsx` did before this fix — it rendered to every
// visitor, signed in or not, because nothing on the way to it ever called
// `getAuthState()`.
//
// Route groups don't change the URL (`(account)/closet` still serves
// `/closet`), so this costs nothing at the routing level — only the file
// tree moved.
//
// Branching, deliberately generic rather than `/closet`-specific — this
// task is the boundary, not the feature. Task 7 owns what a signed-in
// visitor's closet looks like:
//   - `signed-in`      → render `children` untouched; the page decides.
//   - `unconfigured`   → render a message that says so, never redirect or
//                        error (the product must boot the same with zero
//                        Supabase env vars — CLAUDE.md, §4.1 of this
//                        spec). `AuthMenu` renders nothing in this state
//                        on its own, so the surrounding message is the
//                        only thing shown.
//   - `signed-out`     → render a one-line invitation plus the same
//                        `AuthMenu` sign-in control used in the header,
//                        instead of `children`. Not a redirect: a visitor
//                        discovering "Tủ đồ của tôi" from the nav should
//                        see what it is and a way in, not get bounced to
//                        `/` with no explanation (the AuthMenu redirect
//                        pattern `requireUserId()` uses is right for an
//                        action that needs a user, like saving — it is
//                        the wrong feel for a visitor just looking).
//
// Both non-signed-in branches render the *same* generic shape (one line
// of copy + optional `AuthMenu`) on purpose: this layout's job is the
// gate, not the pitch. A future task is free to swap in richer marketing
// copy for the signed-out case without touching the gating logic here.

import { AuthMenu } from '@/components/layout/AuthMenu'
import { getAuthState } from '@/features/account/guard'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authState = await getAuthState()

  if (authState.status === 'signed-in') {
    return <>{children}</>
  }

  const message =
    authState.status === 'unconfigured'
      ? 'Tính năng này cần Supabase được cấu hình, hiện chưa có.'
      : 'Đăng nhập để xem nội dung này.'

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-body text-sm text-accent-soft">{message}</p>
      <div className="mt-6 flex justify-center">
        <AuthMenu authState={authState} />
      </div>
    </div>
  )
}
