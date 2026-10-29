import Link from 'next/link'

export type CtaVariant = 'primary' | 'secondary'

// `primary` chỉ dành cho hành động chính của một trang — tô đặc burgundy nên
// nó phải là nút nặng nhất trong khung nhìn. `secondary` là viền, dùng cho
// lựa chọn thứ hai đứng cạnh. Cả hai đều có `border` để hai nút xếp hàng
// ngang cao bằng nhau.
const VARIANT_CLASS: Record<CtaVariant, string> = {
  primary: 'border border-accent bg-accent text-ivory hover:bg-accent-soft hover:border-accent-soft',
  secondary: 'border border-accent text-accent hover:bg-accent hover:text-ivory',
}

type Props = {
  href: string
  children: React.ReactNode
  variant?: CtaVariant
}

export function CtaLink({ href, children, variant = 'primary' }: Props) {
  return (
    <Link
      href={href}
      className={`inline-block px-8 py-3 font-body text-sm uppercase tracking-[0.14em] transition-colors ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </Link>
  )
}
