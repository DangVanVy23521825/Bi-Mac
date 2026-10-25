import { expect, test } from '@playwright/test'
import { allCategories, allItems, allStyles } from '@/data'

// Generated from the fixtures, not hardcoded — a new item/style/category
// must show up here automatically, or this suite stops being a guard.
const ITEM_PATHS = allItems.map((item) => `/wardrobe/${item.category}/${item.slug}`)
const STYLE_PATHS = allStyles.map((style) => `/styles/${style.slug}`)
const CATEGORY_PATHS = allCategories.map((category) => `/wardrobe/${category.slug}`)
const ALL_DETAIL_PATHS = [...ITEM_PATHS, ...STYLE_PATHS, ...CATEGORY_PATHS]

test.describe('đường demo hai phút', () => {
  test('đi hết đường demo mà không gặp link chết, kể cả ở nhánh dự phòng không có API key', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Sơ mi trắng/ }).first().click()
    await expect(page).toHaveURL('/wardrobe/tops/so-mi-trang')

    await page.getByRole('link', { name: 'Modern Classic' }).first().click()
    await expect(page).toHaveURL('/styles/modern-classic')

    await page.getByRole('link', { name: /AI phối đồ/ }).first().click()
    await expect(page).toHaveURL('/stylist')

    await page.getByLabel('Đi làm').check()
    await page.getByRole('button', { name: /Xem gợi ý/ }).click()

    // Nhánh dự phòng vẫn đi qua hai chặng NDJSON (analyze rồi explain) của
    // provider dự phòng, nên chờ tới khi outfit cụ thể (chặng 2, trạng thái
    // `done`) render xong rồi mới đọc href — chờ riêng tiêu đề "Hướng
    // style" có thể khớp ngay ở chặng 1 (`partial`), trước khi outfit kịp
    // xong.
    await expect(page.getByTestId('recommended-outfit-item').first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('heading', { name: /Hướng style/ })).toBeVisible()

    // Bằng chứng server thực sự chạy không có API key: banner dự phòng chỉ
    // xuất hiện khi `primary` provider là null (xem
    // src/features/stylist/pipeline.ts, getAnalysis, degradedReason
    // 'no-key').
    await expect(page.getByRole('status').filter({ hasText: 'dự phòng' })).toBeVisible()

    const href = await page.getByTestId('recommended-outfit-item').first().getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('mọi trang chi tiết (item, style, category) trả về 200', async ({ page }) => {
    for (const path of ALL_DETAIL_PATHS) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
    }
  })

  test('không vỡ layout ở màn hình 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    for (const path of ['/', '/wardrobe/tops/so-mi-trang', '/styles/minimalist', '/stylist']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      )
      expect(overflow, path).toBe(false)
    }
  })
})
