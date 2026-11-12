// Structural enforcement for everything under `/api/closet`. Task 6 (not
// built yet) adds the first route there (`/api/closet/tag`) and its brief
// already says that route must itself 401 a signed-out caller — this file
// does not remove that responsibility, it makes it redundant-safe: by the
// time any request reaches a route handler under this prefix, Proxy has
// already rejected it if the caller isn't signed in, so a future route
// added under `/api/closet` without its own check is still covered.
//
// This is the API half of the route boundary; `src/app/(account)/layout.tsx`
// is the page half. They don't share one mechanism because they can't:
// Proxy can redirect, rewrite, or respond directly, but it cannot render a
// React tree, so it's the right tool for "reject before the handler runs"
// and the wrong one for "show different UI depending on who's asking" —
// that split, not an oversight, is why there are two files instead of one.
//
// `getAuthState()` is safe to call here even though it's written for
// Server Components/Route Handlers: it degrades to `unconfigured` before
// touching `cookies()` at all when Supabase isn't configured (`env.ts`),
// and when Supabase *is* configured, `cookies()` from `next/headers` does
// work inside Proxy on this Next.js version (16.3.8) — confirmed by
// running a real dev server and hitting a route guarded by a Proxy that
// calls `cookies()`, not assumed from older Next docs that said otherwise
// for `middleware.ts`. See task-3-report.md for how that was checked.
//
// File name/location: `proxy.ts` (not `middleware.ts`) at `src/`, because
// `middleware` is the deprecated name in this Next.js version and `src/`
// is where this project's `app/` directory lives.
//
// Default Node.js runtime applies to Route Handlers, not Proxy — Proxy
// always runs in its own runtime regardless of any `runtime` export
// elsewhere, so there is nothing to set here.

import { NextResponse } from 'next/server'
import { getAuthState } from '@/features/account/guard'

// Next.js calls this with `(request, event)` and only requires declaring
// the parameters actually used — neither is needed here, since the
// decision depends only on auth state, not on anything in the request.
export async function proxy() {
  const authState = await getAuthState()

  if (authState.status !== 'signed-in') {
    return NextResponse.json(
      { error: 'Cần đăng nhập để dùng chức năng này.' },
      { status: 401 },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/closet/:path*'],
}
