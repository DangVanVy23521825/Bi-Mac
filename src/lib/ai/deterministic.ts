// Deterministic (rule-based) StylistProvider. This is the fallback path
// that runs with no API key, on a Gemini error/timeout, or when a rate
// limit trips — see §7 of the architecture doc. It must stay catalog-blind:
// this module may import from `src/types/stylist.ts`, `./provider`, and
// `./schema` only. It must never import `@/data` or catalog entity types
// (`FashionItem`, `Style`, `Color`, `Outfit`) from `@/types/content`, and it
// must never read an environment variable — deciding *which* provider to
// construct belongs to a later task, not this one.

import type { Occasion, OutfitDescriptor, StylistVocabulary } from '@/types/stylist'
import type { AnalyzeRequest, ExplainRequest, StylistProvider } from './provider'
import type { StylistAnalysis, StylistExplanation } from './schema'

// Fixed occasion → style-slug table, pinned by the task brief. Order within
// each list is the fallback ranking for that occasion; affinity for a
// style's position in the final (vocabulary-filtered) ranking is fixed at
// 0.8 / 0.6 / 0.4 regardless of how many occasions contributed to it.
const OCCASION_STYLE: Record<Occasion, string[]> = {
  work: ['modern-classic', 'minimalist', 'quiet-luxury'],
  school: ['casual-chic', 'minimalist', 'soft-feminine'],
  casual: ['casual-chic', 'quiet-luxury', 'modern-classic'],
  date: ['soft-feminine', 'quiet-luxury', 'casual-chic'],
  event: ['quiet-luxury', 'modern-classic', 'soft-feminine'],
}

const AFFINITY_BY_RANK = [0.8, 0.6, 0.4] as const

const OCCASION_LABEL: Record<Occasion, string> = {
  work: 'dịp đi làm',
  school: 'dịp đi học',
  casual: 'dịp thường ngày',
  date: 'dịp hẹn hò',
  event: 'dịp sự kiện',
}

const FALLBACK_NOTE =
  'Đây là gợi ý từ chế độ dự phòng của Bí Mặc (không qua mô hình AI) — kết quả được suy ra theo quy tắc cố định dựa trên dịp mặc bạn chọn, vẫn lấy từ đúng catalog hiện có.'

const DEFAULT_OCCASIONS: Occasion[] = ['casual']

/**
 * Deterministic, order-preserving union of the occasion table's style
 * slugs for every occasion the user picked. First occurrence wins its
 * rank, so the first occasion's list is the primary ranking and later
 * occasions only fill in slots the first occasion didn't claim. No `Set`
 * iteration is used for output order — the `Set` below is only a
 * membership check, never iterated.
 */
function candidateStyleSlugs(occasions: Occasion[]): string[] {
  const list = occasions.length > 0 ? occasions : DEFAULT_OCCASIONS
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const occasion of list) {
    for (const slug of OCCASION_STYLE[occasion]) {
      if (!seen.has(slug)) {
        seen.add(slug)
        ordered.push(slug)
      }
    }
  }
  return ordered
}

function formatOccasions(occasions: Occasion[]): string {
  const list = occasions.length > 0 ? occasions : DEFAULT_OCCASIONS
  return list.map((occasion) => OCCASION_LABEL[occasion]).join(', ')
}

function buildStyleReason(
  style: StylistVocabulary['styles'][number],
  occasions: Occasion[],
): string {
  return `${style.name} khớp với ${formatOccasions(occasions)} bạn đã chọn: ${style.tagline}`
}

function buildColorReason(
  color: StylistVocabulary['colors'][number],
  index: number,
  palette: StylistVocabulary['colors'],
): string {
  if (palette.length === 1) {
    return `${color.name} là tông duy nhất trong palette gợi ý lần này, nên mọi món đều quy về một màu để giữ outfit yên tĩnh.`
  }

  const base = palette[0]
  const baseName = base?.name ?? color.name

  if (index === 0) {
    const rest = palette.slice(1).map((c) => c.name).join(', ')
    return `${color.name} làm tông nền của palette gợi ý lần này, đứng trước ${rest} để các màu còn lại ăn theo mà không tạo tương phản mạnh.`
  }

  if (index === palette.length - 1) {
    return `${color.name} khép lại palette sau ${baseName}, làm điểm neo thứ ${index + 1} mà không kéo thêm màu thứ tư vào set.`
  }

  return `${color.name} nằm giữa ${baseName} và điểm neo cuối của palette, nối tông nền với phần còn lại mà không tách thành một màu rời.`
}

async function analyze(req: AnalyzeRequest): Promise<StylistAnalysis> {
  const vocabStyles = new Map(req.vocabulary.styles.map((style) => [style.slug, style]))
  const candidates = candidateStyleSlugs(req.answers.occasions).filter((slug) => vocabStyles.has(slug))
  const top = candidates.slice(0, 3)

  const styleDirections = top.flatMap((slug, rank) => {
    const style = vocabStyles.get(slug)
    const affinity = AFFINITY_BY_RANK[rank]
    if (!style || affinity === undefined) return []
    return [
      {
        styleSlug: slug,
        affinity,
        reason: buildStyleReason(style, req.answers.occasions),
      },
    ]
  })

  const selectedColors = req.vocabulary.colors.slice(0, 3)
  const palette = selectedColors.map((color, index) => ({
    colorSlug: color.slug,
    reason: buildColorReason(color, index, selectedColors),
  }))

  return {
    styleDirections,
    palette,
    notes: [FALLBACK_NOTE],
  }
}

function describeProportion(outfit: OutfitDescriptor): string {
  const items = outfit.itemNames
  const firstItem = items[0]
  const lastItem = items[items.length - 1]
  if (items.length > 1 && firstItem !== undefined && lastItem !== undefined) {
    return `${firstItem} giữ phần trên gọn, ${lastItem} cân lại phần còn lại, nên "${outfit.name}" không lệch hẳn về một phía.`
  }
  const only = firstItem ?? outfit.name
  return `${only} đứng một mình trong set này, nên tỷ lệ phụ thuộc hoàn toàn vào đường cắt của chính món đó.`
}

function describeLayering(outfit: OutfitDescriptor): string {
  const items = outfit.itemNames
  const middleCount = Math.max(items.length - 2, 0)
  const secondItem = items[1]
  if (middleCount === 1 && secondItem !== undefined) {
    return `${secondItem} thêm một lớp giữa, đủ để chia vai trò với hai món còn lại mà không món nào lặp việc của món khác.`
  }
  if (middleCount > 1) {
    return `${middleCount} món còn lại chia nhau vai trò lớp giữa, nên set có nhiều hơn một lớp mà không món nào thừa.`
  }
  return `Set chỉ gồm ${items.length} món, không có lớp giữa nào để chia bớt vai trò.`
}

function describeColors(outfit: OutfitDescriptor): string {
  const colors = outfit.colorNames
  const firstColor = colors[0]
  if (colors.length > 1) {
    return `${colors.join(', ')} là những tông đứng gần nhau, nên các món lặp lại màu của nhau thay vì tạo tương phản mạnh.`
  }
  return `Toàn bộ set giữ nguyên một tông ${firstColor ?? 'trung tính'}, không có điểm nào kéo thêm chú ý.`
}

function describeFormality(outfit: OutfitDescriptor): string {
  const styles = outfit.styleNames
  if (styles.length > 0) {
    return `Hướng ${styles.join(', ')} đặt outfit ở mức chỉn chu vừa đủ cho các dịp mà phong cách này thường xuất hiện, không cần thêm chi tiết trang trí.`
  }
  return 'Set giữ mức chỉn chu trung bình, đủ linh hoạt cho nhiều dịp khác nhau.'
}

function composeWhyThisWorks(outfit: OutfitDescriptor): string {
  return [
    describeProportion(outfit),
    describeLayering(outfit),
    describeColors(outfit),
    describeFormality(outfit),
  ].join(' ')
}

async function explain(req: ExplainRequest): Promise<StylistExplanation> {
  return {
    outfits: req.outfits.map((outfit) => ({
      outfitSlug: outfit.slug,
      whyThisWorks: composeWhyThisWorks(outfit),
    })),
  }
}

export function createDeterministicProvider(): StylistProvider {
  return {
    id: 'deterministic',
    analyze,
    explain,
  }
}
