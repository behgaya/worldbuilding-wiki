// Team colors: a display accent only (lines and shapes, never text). Pure helpers shared by the
// server (validation, checks), the pages (style binding) and the tests.

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR.test(v)
}

// The only way a color reaches a style attribute: a validated hex as a CSS custom property,
// or nothing (the CSS then falls back to the theme's own colors).
export function teamStyle(hex: string | null | undefined): Record<string, string> | undefined {
  return isHexColor(hex) ? { '--team': hex } : undefined
}

// The page and card backgrounds (--bg, --surface) of each theme. These mirror main.css; a test
// reads main.css and fails if they drift apart.
export const THEME_BACKGROUNDS = {
  light: ['#f4ecd8', '#fbf6e9'],
  dark: ['#1c1712', '#26201a'],
} as const

export type Theme = keyof typeof THEME_BACKGROUNDS

// How much of the team color is kept in the light theme. Must match the CSS in main.css:
// color-mix(in srgb, var(--team) 65%, black).
export const LIGHT_MIX = 0.65

export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

const toHex = (rgb: number[]) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')

// WCAG relative luminance of an sRGB color.
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// WCAG contrast ratio, from 1 (same color) to 21 (black on white).
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// The same math as CSS color-mix(in srgb, <hex> 65%, black): each channel scaled toward 0.
export function shadeForLight(hex: string): string {
  return toHex(hexToRgb(hex).map((c) => Math.round(c * LIGHT_MIX)))
}

// The color actually drawn in each theme: as written on dark, darkened on light.
export function effectiveColors(hex: string): Record<Theme, string> {
  return { dark: hex.toLowerCase(), light: shadeForLight(hex) }
}

// The lowest contrast of the drawn color against each theme's backgrounds (page and cards).
export function themeContrast(hex: string): Record<Theme, number> {
  const drawn = effectiveColors(hex)
  const lowest = (theme: Theme) => Math.min(...THEME_BACKGROUNDS[theme].map((bg) => contrastRatio(drawn[theme], bg)))
  return { dark: lowest('dark'), light: lowest('light') }
}
