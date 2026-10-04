export const NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/wardrobe', label: 'Tủ đồ' },
  { href: '/stylist', label: 'AI phối đồ' },
  { href: '/styles', label: 'Phối theo style' },
  { href: '/closet', label: 'Tủ đồ của tôi' },
] as const

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
