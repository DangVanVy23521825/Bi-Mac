// Thay cho package `server-only` khi chạy dưới Vitest.
//
// `server-only/index.js` **ném lỗi ngay khi được import** — đó chính là cơ
// chế của nó: nó chỉ resolve về một module rỗng dưới điều kiện export
// `react-server`, tức là trong cây React Server Component của Next.js. Mọi
// nơi khác (bundle client — và cả Vitest, vốn chạy theo điều kiện `node`)
// thì nó nổ. Nhờ vậy `pnpm build` gãy nếu `src/lib/supabase/admin.ts` lọt
// vào bundle client, và service-role key không bao giờ ra tới trình duyệt.
//
// Vitest không phải bundle client, nên bắn lỗi ở đó chỉ là nhiễu: nó sẽ chặn
// `delete.integration.test.ts` import `deleteAccount` dù chẳng có rủi ro rò
// khoá nào. Alias trong `vitest.config.mts` trỏ `server-only` về file này.
//
// Alias chỉ sống trong cấu hình test — `next build` vẫn dùng package thật,
// nên hàng rào thật không bị nới lỏng chút nào.

export {}
