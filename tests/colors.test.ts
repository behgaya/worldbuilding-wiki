import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  checkColors,
  entryFrom,
  membersOf,
  parseEntry,
  summariesFrom,
  type LoadedFile,
} from '../server/utils/entries.ts'
import {
  LIGHT_MIX,
  THEME_BACKGROUNDS,
  contrastRatio,
  isHexColor,
  shadeForLight,
  teamStyle,
  themeContrast,
} from '../shared/utils/color.ts'

// Builds a seed file's text from frontmatter lines.
const file = (lines: string[], body = '') => `---\n${lines.join('\n')}\n---\n${body}`

const group = (slug: string, extra: string[] = [], visibility = 'public', canon = 'canon') =>
  file([
    `slug: ${slug}`,
    'type: group',
    `name: ${slug}`,
    'kind: hunter-team',
    'status: registered',
    `canon: ${canon}`,
    `visibility: ${visibility}`,
    'development: stub',
    ...extra,
  ])

const character = (slug: string, name: string, memberships: string[] = [], extra: string[] = [], body = '') =>
  file(
    [
      `slug: ${slug}`,
      'type: character',
      `name: ${name}`,
      'canon: canon',
      'visibility: public',
      'development: stub',
      ...(memberships.length ? ['memberships:', ...memberships.map((m) => `  - ${m}`)] : []),
      ...extra,
    ],
    body,
  )

// Turns texts into loaded files, the same way the reader does (invalid ones keep their reason).
function load(files: Record<string, string>): LoadedFile[] {
  return Object.entries(files).map(([slug, text]) => {
    try {
      return { section: 'people', slug, loaded: { ok: true as const, entry: parseEntry(text, 'people', slug) } }
    } catch (err) {
      return { section: 'people', slug, loaded: { ok: false as const, reason: (err as Error).message } }
    }
  })
}

const reason = (text: string, slug: string) => {
  try {
    parseEntry(text, 'people', slug)
    return null
  } catch (err) {
    return (err as Error).message
  }
}

describe('color field', () => {
  it('accepts a quoted hex and stores it lowercased', () => {
    expect(parseEntry(group('crew', ['color: "#E8873A"']), 'people', 'crew').color).toBe('#e8873a')
  })

  it.each([
    ['3 digits', '"#fff"'],
    ['no #', '"e8873a"'],
    ['a named color', 'orange'],
    ['8 digits', '"#e8873a00"'],
    ['extra characters', '"#e8873ax"'],
    ['a CSS injection attempt', '"#fff; background: red"'],
    ['a number', '123456'],
  ])('rejects %s', (_label, value) => {
    expect(reason(group('crew', [`color: ${value}`]), 'crew')).toMatch(/color must be "#" and 6 hex digits/)
  })

  it('rejects an unquoted color (YAML reads # as a comment) with the quoting reason', () => {
    expect(reason(group('crew', ['color: #e8873a']), 'crew')).toBe('color must be quoted, like "#e8873a"')
    expect(reason(group('crew', ['color: ""']), 'crew')).toBe('color must be quoted, like "#e8873a"')
  })

  it('ignores a color on a non-group, and check warns', () => {
    const all = load({ zayn: character('zayn', 'Zayn', [], ['color: "#e8873a"']), kai: character('kai', 'Kai', [], ['color: #e8873a']) })
    expect(all.every((f) => f.loaded.ok)).toBe(true)
    expect(entryFrom(all, 'people', 'zayn')!.teamColor).toBeNull()
    expect(entryFrom(all, 'people', 'zayn')!.color).toBeUndefined()
    const warnings = checkColors(all).filter((p) => p.kind === 'color on a non-group (ignored)')
    expect(warnings.map((w) => [w.file, w.slug])).toEqual([
      ['seed/people/zayn.md', '#e8873a'],
      ['seed/people/kai.md', '(empty)'],
    ])
  })
})

describe('team color derivation', () => {
  const all = load({
    red: group('red', ['color: "#d9453f"']),
    blue: group('blue', ['color: "#4a7de0"']),
    plain: group('plain'),
    old: group('old', ['color: "#4cb860"'], 'public', 'retired'),
    first: character('first', 'First', ['{ group: red, status: current }', '{ group: blue, status: current }']),
    'former-only': character('former-only', 'Former', ['{ group: red, status: former }', '{ group: blue, status: planned }']),
    later: character('later', 'Later', ['{ group: red, status: former }', '{ group: blue, status: current }']),
    nocolor: character('nocolor', 'No Color', ['{ group: plain, status: current }']),
    missing: character('missing', 'Missing', ['{ group: ghost-team, status: current }']),
    'retired-member': character('retired-member', 'Retired Member', ['{ group: old, status: current }']),
  })
  const teamColor = (slug: string) => entryFrom(all, 'people', slug)!.teamColor

  it("uses the first public current membership's group", () => {
    expect(teamColor('first')).toBe('#d9453f')
    expect(teamColor('later')).toBe('#4a7de0')
  })

  it('gives null for former/planned only, a missing group, or a group without a color', () => {
    expect(teamColor('former-only')).toBeNull()
    expect(teamColor('missing')).toBeNull()
    expect(teamColor('nocolor')).toBeNull()
  })

  it('never shows a retired group\'s color, on its members or itself', () => {
    expect(teamColor('retired-member')).toBeNull()
    expect(entryFrom(all, 'people', 'old')!.color).toBeNull()
    expect(summariesFrom(all, 'people', 'group').find((g) => g.slug === 'old')!.color).toBeNull()
  })

  it('puts color on group answers and teamColor on character answers', () => {
    expect(entryFrom(all, 'people', 'red')!.color).toBe('#d9453f')
    const groups = summariesFrom(all, 'people', 'group')
    expect(groups.find((g) => g.slug === 'blue')).toMatchObject({ color: '#4a7de0', teamColor: null })
    const chars = summariesFrom(all, 'people', 'character')
    expect(chars.find((c) => c.slug === 'first')).toMatchObject({ teamColor: '#d9453f', color: null })
  })
})

describe('a hidden group leaves no color behind', () => {
  const all = load({
    secret: group('secret', ['color: "#123abc"'], 'author'),
    open: group('open', ['color: "#4a7de0"']),
    agent: character('agent', 'Agent', ['{ group: secret, status: current }', '{ group: open, status: current }'], [], 'Works with [[open]].'),
    solo: character('solo', 'Solo', ['{ group: secret, status: current }']),
  })

  it('appears in no character entry, summary, group list, member list or backlink', () => {
    expect(all.find((f) => f.slug === 'secret')!.loaded.ok).toBe(true) // valid, just hidden
    const out = JSON.stringify([
      entryFrom(all, 'people', 'agent'),
      entryFrom(all, 'people', 'solo'),
      entryFrom(all, 'people', 'open'),
      entryFrom(all, 'people', 'secret'),
      summariesFrom(all, 'people'),
      summariesFrom(all, 'people', 'character'),
      summariesFrom(all, 'people', 'group'),
      membersOf('open', all),
      membersOf('secret', all),
    ])
    expect(out).not.toContain('#123abc')
    expect(entryFrom(all, 'people', 'agent')!.teamColor).toBe('#4a7de0') // skips the hidden group
    expect(entryFrom(all, 'people', 'solo')!.teamColor).toBeNull()
  })

  it('is not checked or compared by npm run check', () => {
    expect(JSON.stringify(checkColors(all))).not.toContain('#123abc')
  })
})

describe('color helpers', () => {
  it('validates hex and only ever builds a style from a valid one', () => {
    expect(isHexColor('#e8873a')).toBe(true)
    expect(isHexColor('#E8873A')).toBe(true)
    expect(isHexColor('#fff; background: red')).toBe(false)
    expect(teamStyle('#e8873a')).toEqual({ '--team': '#e8873a' })
    expect(teamStyle('#fff; background: red')).toBeUndefined()
    expect(teamStyle(null)).toBeUndefined()
  })

  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#e8873a', '#e8873a')).toBe(1)
  })

  it('darkens for the light theme like color-mix(in srgb, X 65%, black)', () => {
    expect(LIGHT_MIX).toBe(0.65)
    expect(shadeForLight('#e8873a')).toBe('#975826')
    expect(shadeForLight('#ffffff')).toBe('#a6a6a6')
  })

  it('flags a dark navy on the dark theme and a pale yellow on the light theme', () => {
    expect(themeContrast('#1a2340').dark).toBeLessThan(3)
    expect(themeContrast('#f5e8a0').light).toBeLessThan(3)
    const problems = checkColors(load({ navy: group('navy', ['color: "#1a2340"']), pale: group('pale', ['color: "#f5e8a0"']) }))
    expect(problems.find((p) => p.file === 'seed/people/navy.md')!.kind).toMatch(/in dark theme/)
    expect(problems.find((p) => p.file === 'seed/people/pale.md')!.kind).toMatch(/in light theme \(shown as #9f976[89]\)/)
  })

  it('passes the six planned colors in both themes', () => {
    for (const c of ['#e8873a', '#4a7de0', '#ecc928', '#4cb860', '#22d3e0', '#d9453f']) {
      const { dark, light } = themeContrast(c)
      expect(Math.min(dark, light)).toBeGreaterThanOrEqual(3)
    }
  })

  it('flags two public groups with the same color, naming both', () => {
    const problems = checkColors(load({ a: group('a', ['color: "#4a7de0"']), b: group('b', ['color: "#4A7DE0"']) }))
    const dup = problems.filter((p) => p.kind === 'same color on more than one group')
    expect(dup).toHaveLength(1)
    expect(dup[0]!.file).toBe('seed/people/a.md and seed/people/b.md')
    expect(problems.every((p) => p.level === 'warn')).toBe(true)
  })

  it('mirrors the theme backgrounds and the 65% mix in main.css', () => {
    const css = readFileSync(new URL('../app/assets/css/main.css', import.meta.url), 'utf-8')
    const value = (block: string, name: string) => block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]?.toLowerCase()
    const light = css.slice(css.indexOf(':root {'))
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"))
    expect([value(light, 'bg'), value(light, 'surface')]).toEqual([...THEME_BACKGROUNDS.light])
    expect([value(dark, 'bg'), value(dark, 'surface')]).toEqual([...THEME_BACKGROUNDS.dark])
    // The dark palette appears twice (theme toggle and OS preference); both must match.
    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))
    expect([value(media, 'bg'), value(media, 'surface')]).toEqual([...THEME_BACKGROUNDS.dark])
    expect(css).toContain('color-mix(in srgb, var(--team) 65%, black)')
  })
})
