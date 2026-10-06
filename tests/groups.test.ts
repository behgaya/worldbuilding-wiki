import { describe, expect, it } from 'vitest'
import {
  checkProblems,
  indexFrom,
  isKnownType,
  membersOf,
  parseEntry,
  publicMemberships,
  sortByOrder,
  type LoadedFile,
} from '../server/utils/entries.ts'
import { primaryGroup } from '../shared/utils/membership.ts'

// Builds a seed file's text from frontmatter lines.
const file = (lines: string[], body = '') => `---\n${lines.join('\n')}\n---\n${body}`

const group = (slug: string, extra: string[] = []) =>
  file([
    `slug: ${slug}`,
    'type: group',
    `name: ${slug}`,
    'kind: hunter-team',
    'status: registered',
    'canon: canon',
    'visibility: public',
    'development: stub',
    ...extra,
  ])

const character = (slug: string, name: string, memberships: string[] = [], visibility = 'public') =>
  file([
    `slug: ${slug}`,
    'type: character',
    `name: ${name}`,
    'canon: canon',
    `visibility: ${visibility}`,
    'development: stub',
    ...(memberships.length ? ['memberships:', ...memberships.map((m) => `  - ${m}`)] : []),
  ])

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

describe('group validation', () => {
  it('accepts a valid group, with and without order', () => {
    expect(parseEntry(group('team-a', ['order: 2']), 'people', 'team-a').order).toBe(2)
    expect(parseEntry(group('team-a'), 'people', 'team-a').order).toBeUndefined()
  })

  it('rejects a bad kind', () => {
    const text = group('team-a').replace('kind: hunter-team', 'kind: hunters')
    expect(() => parseEntry(text, 'people', 'team-a')).toThrow(/kind must be one of/)
  })

  it('rejects a bad status', () => {
    const text = group('team-a').replace('status: registered', 'status: legal')
    expect(() => parseEntry(text, 'people', 'team-a')).toThrow(/status must be one of/)
  })

  it('rejects an order that is not a whole number', () => {
    expect(() => parseEntry(group('team-a', ['order: 1.5']), 'people', 'team-a')).toThrow(/order must be a whole number/)
    expect(() => parseEntry(group('team-a', ['order: "1"']), 'people', 'team-a')).toThrow(/order must be a whole number/)
  })

  it('rejects a slug that does not match the file name', () => {
    expect(() => parseEntry(group('team-a'), 'people', 'team-b')).toThrow(/doesn't match the file name/)
  })

  it('rejects a membership that uses a display name instead of a slug', () => {
    const text = character('zed', 'Zed', ['{ group: Team Vulcan, status: current }'])
    expect(() => parseEntry(text, 'people', 'zed')).toThrow(/group slug like team-vulcan/)
  })
})

describe('members', () => {
  const all = load({
    'team-a': group('team-a'), // no member list in the group file
    current: character('current', 'Bea', ['{ group: team-a, status: current }']),
    current2: character('current2', 'Ana', ['{ group: team-a, status: current }']),
    former: character('former', 'Fay', ['{ group: team-a, status: former }']),
    planned: character('planned', 'Pia', ['{ group: team-a, status: planned }']),
    hidden: character('hidden', 'Hidden Person', ['{ group: team-a, status: current }'], 'author'),
  })
  const members = membersOf('team-a', all)

  it('lists current members of public characters, sorted by name, without the group file listing them', () => {
    expect(members).toEqual([
      { slug: 'current2', name: 'Ana', title: undefined, href: '/people/characters/current2', bust: null },
      { slug: 'current', name: 'Bea', title: undefined, href: '/people/characters/current', bust: null },
    ])
  })

  it('leaves out former and planned memberships and non-public characters', () => {
    const names = members.map((m) => m.name)
    expect(names).not.toContain('Fay')
    expect(names).not.toContain('Pia')
    expect(names).not.toContain('Hidden Person')
  })
})

describe('public memberships and the primary group', () => {
  const all = load({
    'team-a': group('team-a'),
    'team-b': group('team-b'),
    'team-c': group('team-c'),
    'team-d': group('team-d', []).replace('visibility: public', 'visibility: author'),
  })
  const index = indexFrom(all)
  const raw = [
    { group: 'team-d', status: 'current' as const }, // hidden group, first in the file
    { group: 'zz-missing', status: 'current' as const },
    { group: 'team-a', status: 'former' as const },
    { group: 'team-b', status: 'current' as const },
    { group: 'team-c', status: 'current' as const },
  ]

  it('keeps only current memberships to public groups, in file order', () => {
    expect(publicMemberships(raw, index)).toEqual([
      { group: 'team-b', status: 'current' },
      { group: 'team-c', status: 'current' },
    ])
  })

  it('places the character under the first of those', () => {
    expect(primaryGroup(publicMemberships(raw, index))).toBe('team-b')
    expect(primaryGroup([])).toBeUndefined()
  })
})

describe('npm run check: memberships', () => {
  const all = load({
    'team-a': group('team-a'),
    'team-secret': group('team-secret').replace('visibility: public', 'visibility: author'),
    other: character('other', 'Other'),
    zed: character('zed', 'Zed', [
      '{ group: zz-missing, status: current }',
      '{ group: other, status: current }',
      '{ group: team-secret, status: planned }',
      '{ group: team-a, status: current }',
    ]),
  })
  const problems = checkProblems(all).filter((p) => p.file === 'seed/people/zed.md')

  it('reports a membership to a missing group as an error', () => {
    expect(problems).toContainEqual({
      level: 'error',
      kind: 'membership group missing',
      file: 'seed/people/zed.md',
      where: 'memberships (current)',
      slug: 'zz-missing',
    })
  })

  it('reports a membership to something that is not a group as an error', () => {
    expect(problems).toContainEqual(expect.objectContaining({ level: 'error', kind: 'membership target is not a group', slug: 'other' }))
  })

  it('reports a membership to a hidden group as a warning, and a valid one not at all', () => {
    expect(problems).toContainEqual(expect.objectContaining({ level: 'warn', kind: 'target not public', slug: 'team-secret' }))
    expect(problems.map((p) => p.slug)).not.toContain('team-a')
  })
})

describe('group order', () => {
  it('sorts by order, ties by name, groups without order last', () => {
    const sorted = sortByOrder([
      { name: 'Two', order: 2 },
      { name: 'No order B' },
      { name: 'One B', order: 1 },
      { name: 'No order A' },
      { name: 'One A', order: 1 },
    ])
    expect(sorted.map((g) => g.name)).toEqual(['One A', 'One B', 'Two', 'No order A', 'No order B'])
  })
})

describe('?type= on the list endpoint', () => {
  it('accepts known types only', () => {
    expect(isKnownType('character')).toBe(true)
    expect(isKnownType('group')).toBe(true)
    expect(isKnownType('grup')).toBe(false)
    expect(isKnownType('toString')).toBe(false)
    expect(isKnownType(['group'])).toBe(false)
  })
})
