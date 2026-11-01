'use client'

// Nút lưu một món/style vào Tủ đồ của tôi — dùng trên cả trang chi tiết
// item (`/wardrobe/[category]/[slug]`) và style (`/styles/[slug]`), hai
// trang công khai không cần đăng nhập để xem (quyết định #3 trong brief).
//
// Một chữ gạch chân, không phải một nút pill hay một card — cùng ngôn ngữ
// với "Sửa nhãn"/"Xoá" trong `ClosetItemCard` và nút đăng nhập trong
// `AuthMenu`. Một hàng nút lưu là dấu hiệu dashboard rõ nhất
// (docs/06_DESIGN_SYSTEM.md), nên control này cố tình im lặng.
//
// Chưa đăng nhập (quyết định #1): dẫn người xem đi đăng nhập, không ẩn
// control đi — họ cần biết tính năng "lưu" tồn tại. Chưa cấu hình Supabase
// (quyết định #2): trang gọi component này không render gì — xử lý ở nơi
// gọi (`ItemDetailPage`/`StyleDetailPage`), giống `AuthMenu` không tự
// render gì ở trạng thái `unconfigured`.
//
// `onToggle` là Server Action đã được trang cha chọn sẵn
// (`toggleSavedItemAction`/`toggleSavedStyleAction`) — cùng kỹ thuật
// `AddItemForm`/`ClosetItemCard` truyền `onCreate`/`onUpdate`/`onDelete`:
// component này không tự quyết định gọi action nào, chỉ gọi cái được giao.

import { useState, useTransition } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type ToggleSavedResult = { ok: true; saved: boolean } | { ok: false; error: string }

type Props = {
  slug: string
  initialSaved: boolean
  isSignedIn: boolean
  onToggle: (slug: string) => Promise<ToggleSavedResult>
}

export function SaveButton({ slug, initialSaved, isSignedIn, onToggle }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [error, setError] = useState<string | undefined>(undefined)
  const [pending, startTransition] = useTransition()

  if (!isSignedIn) {
    async function handleSignIn() {
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
        className="font-body text-sm uppercase tracking-[0.14em] text-accent underline underline-offset-4 hover:text-accent-soft"
      >
        Đăng nhập để lưu
      </button>
    )
  }

  function handleClick() {
    setError(undefined)
    startTransition(async () => {
      const result = await onToggle(slug)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(result.saved)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={saved}
        className="font-body text-sm uppercase tracking-[0.14em] text-accent underline underline-offset-4 hover:text-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : saved ? 'Đã lưu — bỏ lưu' : 'Lưu vào tủ đồ của tôi'}
      </button>
      {error && (
        <p role="alert" className="mt-2 font-body text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}
