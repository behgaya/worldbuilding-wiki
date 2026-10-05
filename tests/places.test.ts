import { describe, expect, it } from 'vitest'
import {
  breadcrumbOf,
  checkProblems,
  childrenOf,
  entryFrom,
  hrefFor,
  indexFrom,
  parseEntry,
  renderMarkdown,
  type LoadedFile,
} from '../server/utils/entries.ts'

// A place file; `fields` override the defaults, and `null` removes a field.
function place(slug: string, fields: Record<string, string | number | null> = {}, body = '') {
  const front: Record<string, string | number | null> = {
    type: 'place',
    slug,
    name: slug.toUpperCase(),
    kind: 'state',
    canon: 'canon',
    visibility: 'public',
    development: 'stub',
    ...fields,
  }
  const yaml = Object.entries(front)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\n${yaml}\n---\n${body}`
}

function load(files: Record<string, string>, section = 'places'): LoadedFile[] {
  return Object.entries(files).map(([slug, text]) => ({
    section,
    slug,
    loaded: { ok: true as const, entry: parseEntry(text, section, slug) },
  }))
}

// A small Zhoter: nation > regions > states (> one avenue-like great-grandchild via kind state).
const world = () => ({
  zhoter: place('zhoter', { name: 'Zhoter', kind: 'nation' }),
  'zhoter-north': place('zhoter-north', { name: 'North', kind: 'region', parent: 'zhoter', order: 1 }),
  'zhoter-east': place('zhoter-east', { name: 'East', kind: 'region', parent: 'zhoter', order: 2 }),
  riquehen: place('riquehen', { name: 'Riquehen', parent: 'zhoter-north', order: 1, caption: '"Engine of Zhoter"' }),
  kubetz: place('kubetz', { name: 'Kubetz', parent: 'zhoter-north', order: 2 }),
  trovic: place('trovic', { name: 'Trovic', parent: 'zhoter-north', order: 3 }),
  durqosa: place('durqosa', { name: 'Durqosa', parent: 'zhoter-east', order: 1 }),
  deep: place('deep', { name: 'Deep Place', parent: 'trovic' }), // a great-grandchild of Zhoter
})

describe('place validation', () => {
  it('accepts a valid place with kind, parent, order and caption', () => {
    const p = parseEntry(place('trovic', { parent: 'zhoter-north', order: 3, caption: 'Nickname' }), 'places', 'trovic')
    expect([p.kind, p.parent, p.order, p.caption]).toEqual(['state', 'zhoter-north', 3, 'Nickname'])
  })

  it('rejects a missing kind and a bad kind', () => {
    expect(() => parseEntry(place('x', { kind: null }), 'places', 'x')).toThrow(/kind must be one of/)
    expect(() => parseEntry(place('x', { kind: 'city' }), 'places', 'x')).toThrow(/kind must be one of/)
  })

  it('rejects a parent that is not a slug', () => {
    expect(() => parseEntry(place('x', { parent: '"Zhoter North"' }), 'places', 'x')).toThrow(/parent must be a place slug/)
  })

  it('rejects an order that is not a whole number', () => {
    expect(() => parseEntry(place('x', { order: 1.5 }), 'places', 'x')).toThrow(/order must be a whole number/)
  })

  it('rejects a slug that does not match the file name', () => {
    expect(() => parseEntry(place('x'), 'places', 'y')).toThrow(/doesn't match the file name/)
  })
})

describe('childrenOf', () => {
  it('lists public children sorted by order, then name, then no order last, two levels deep', () => {
    const all = load({
      ...world(),
      'zhoter-west': place('zhoter-west', { name: 'West', kind: 'region', parent: 'zhoter' }), // no order
      'zhoter-aaa': place('zhoter-aaa', { name: 'Aaa', kind: 'region', parent: 'zhoter', order: 2 }), // ties with East
    })
    const kids = childrenOf('zhoter', all)
    expect(kids.map((c) => c.name)).toEqual(['North', 'Aaa', 'East', 'West'])
    expect(kids[0]).toMatchObject({ slug: 'zhoter-north', kind: 'region', href: '/places/zhoter-north' })
    expect(kids[0]!.children!.map((c) => c.name)).toEqual(['Riquehen', 'Kubetz', 'Trovic'])
    expect(kids[0]!.children![0]).toEqual({
      slug: 'riquehen',
      name: 'Riquehen',
      caption: 'Engine of Zhoter',
      kind: 'state',
      href: '/places/riquehen',
    })
    // Two levels and no further: Trovic's own child isn't included under Zhoter.
    expect(kids[0]!.children!.find((c) => c.slug === 'trovic')!.children).toBeUndefined()
    expect(JSON.stringify(kids)).not.toContain('Deep Place')
  })

  it('a region returns its states, each with an empty-or-absent next level', () => {
    const kids = childrenOf('zhoter-north', load(world()))
    expect(kids.map((c) => c.slug)).toEqual(['riquehen', 'kubetz', 'trovic'])
    expect(kids.map((c) => c.children)).toEqual([[], [], [{ slug: 'deep', name: 'Deep Place', caption: undefined, kind: 'state', href: '/places/deep' }]])
  })

  it('leaves out hidden and retired children', () => {
    const files: Record<string, string> = {
      ...world(),
      kubetz: place('kubetz', { name: 'Kubetz', parent: 'zhoter-north', order: 2, visibility: 'author' }),
      trovic: place('trovic', { name: 'Trovic', parent: 'zhoter-north', order: 3, canon: 'retired' }),
    }
    expect(childrenOf('zhoter-north', load(files)).map((c) => c.slug)).toEqual(['riquehen'])
  })

  it('a state under a hidden region appears nowhere in the nation block', () => {
    const files: Record<string, string> = {
      ...world(),
      'zhoter-north': place('zhoter-north', { name: 'North', kind: 'region', parent: 'zhoter', order: 1, visibility: 'author' }),
    }
    const json = JSON.stringify(childrenOf('zhoter', load(files)))
    expect(json).not.toContain('zhoter-north')
    for (const hidden of ['riquehen', 'kubetz', 'trovic', 'Riquehen', 'Kubetz', 'Trovic']) expect(json).not.toContain(hidden)
    expect(json).toContain('durqosa')
  })
})

describe('breadcrumb', () => {
  it('walks up through public places, nearest first, never including the entry itself', () => {
    const crumbs = breadcrumbOf('trovic', load(world()))
    expect(crumbs).toEqual([
      { slug: 'zhoter-north', name: 'North', href: '/places/zhoter-north' },
      { slug: 'zhoter', name: 'Zhoter', href: '/places/zhoter' },
    ])
    expect(crumbs.map((c) => c.slug)).not.toContain('trovic')
    expect(breadcrumbOf('zhoter', load(world()))).toEqual([])
  })

  it('stops at a hidden ancestor and shows nothing above it', () => {
    const files: Record<string, string> = {
      ...world(),
      'zhoter-north': place('zhoter-north', { name: 'North', kind: 'region', parent: 'zhoter', visibility: 'author' }),
    }
    expect(breadcrumbOf('trovic', load(files))).toEqual([])
    expect(breadcrumbOf('deep', load(files)).map((c) => c.slug)).toEqual(['trovic'])
  })

  it('stops at a missing parent', () => {
    const all = load({ lost: place('lost', { parent: 'nowhere' }), child: place('child', { parent: 'lost' }) })
    expect(breadcrumbOf('child', all).map((c) => c.slug)).toEqual(['lost'])
    expect(breadcrumbOf('lost', all)).toEqual([])
  })

  it('terminates on cycles, including a place that is its own parent', () => {
    const all = load({ a: place('a', { parent: 'b' }), b: place('b', { parent: 'a' }), self: place('self', { parent: 'self' }) })
    expect(breadcrumbOf('a', all).map((c) => c.slug)).toEqual(['b'])
    expect(breadcrumbOf('self', all)).toEqual([])
  })
})

describe('npm run check: place parents', () => {
  const all = [
    ...load({
      ok: place('ok', { kind: 'nation' }),
      orphan: place('orphan', { parent: 'nowhere' }),
      wrong: place('wrong', { parent: 'zayn' }),
      hidden: place('hidden', { kind: 'region', visibility: 'author' }),
      under: place('under', { parent: 'hidden' }),
      a: place('a', { parent: 'b' }),
      b: place('b', { parent: 'a' }),
      self: place('self', { parent: 'self' }),
      fine: place('fine', { parent: 'ok' }),
    }),
    ...load({ zayn: `---\ntype: character\nslug: zayn\nname: Zayn\ncanon: canon\nvisibility: public\ndevelopment: stub\n---\n` }, 'people'),
  ]
  const problems = checkProblems(all)
  const find = (slug: string) => problems.filter((p) => p.file === `seed/places/${slug}.md`)

  it('missing parent is an error', () => {
    expect(find('orphan')).toEqual([{ level: 'error', kind: 'parent missing', file: 'seed/places/orphan.md', where: 'parent', slug: 'nowhere' }])
  })

  it('a parent that is not a place is an error', () => {
    expect(find('wrong')).toContainEqual(expect.objectContaining({ level: 'error', kind: 'parent is not a place', slug: 'zayn' }))
  })

  it('a hidden parent is a warning', () => {
    expect(find('under')).toEqual([expect.objectContaining({ level: 'warn', kind: 'target not public', where: 'parent', slug: 'hidden' })])
  })

  it('cycles are errors, including a self-parent', () => {
    expect(find('a')).toContainEqual(expect.objectContaining({ level: 'error', kind: 'parent cycle' }))
    expect(find('b')).toContainEqual(expect.objectContaining({ level: 'error', kind: 'parent cycle' }))
    expect(find('self')).toContainEqual(expect.objectContaining({ level: 'error', kind: 'parent cycle' }))
  })

  it('a valid parent gives no problem', () => {
    expect(find('fine')).toEqual([])
    expect(find('ok')).toEqual([])
  })
})

describe('URLs', () => {
  it('places have no type segment; character and group URLs are unchanged', () => {
    expect(hrefFor('places', 'place', 'trovic')).toBe('/places/trovic')
    expect(hrefFor('people', 'character', 'zayn')).toBe('/people/characters/zayn')
    expect(hrefFor('people', 'group', 'team-vulcan')).toBe('/people/groups/team-vulcan')
  })

  it('[[trovic]] links to /places/trovic', () => {
    const index = indexFrom(load(world()))
    expect(renderMarkdown('Born in [[trovic]].', index).html).toBe('<p>Born in <a href="/places/trovic">Trovic</a>.</p>\n')
  })

  it('the API answer for a place has kind, order, breadcrumb and children, and never the parent slug field', () => {
    const e = entryFrom(load(world()), 'places', 'trovic')!
    expect([e.kind, e.order]).toEqual(['state', 3])
    expect(e.breadcrumb!.map((c) => c.slug)).toEqual(['zhoter-north', 'zhoter'])
    expect(e.children!.map((c) => c.slug)).toEqual(['deep'])
    expect(Object.keys(e)).not.toContain('parent')
  })
})
