import { describe, expect, it } from 'vitest'
import { backlinksTo, entryFrom, parseEntry, type LoadedFile } from '../server/utils/entries.ts'

// A seed file: frontmatter fields plus an optional Markdown body.
function entry(slug: string, fields: Record<string, string> = {}, body = '', extraYaml = '') {
  const front = {
    slug,
    type: 'character',
    name: slug.toUpperCase(),
    canon: 'canon',
    visibility: 'public',
    development: 'stub',
    ...fields,
  }
  const yaml = Object.entries(front).map(([k, v]) => `${k}: ${v}`).join('\n')
  return `---\n${yaml}\n${extraYaml}---\n${body}`
}

function load(files: Record<string, string>, section = 'people'): LoadedFile[] {
  return Object.entries(files).map(([slug, text]) => ({
    section,
    slug,
    loaded: { ok: true as const, entry: parseEntry(text, section, slug) },
  }))
}

const target = entry('susie', { name: 'Susie' })
const slugs = (all: LoadedFile[]) => backlinksTo('susie', all).map((b) => b.slug)

describe('backlinks', () => {
  it('a public page linking to a public target produces a backlink with the right fields', () => {
    const all = load({ susie: target, zayn: entry('zayn', { name: 'Zayn' }, '## Relationships\n\nPartner of [[susie]].') })
    expect(backlinksTo('susie', all)).toEqual([
      { section: 'people', type: 'character', slug: 'zayn', name: 'Zayn', href: '/people/characters/zayn' },
    ])
  })

  it('links in the intro, a custom-text link and an infobox value all count', () => {
    const all = load({
      susie: target,
      a: entry('a', {}, 'Intro mentions [[susie]].'),
      b: entry('b', {}, '## X\n\nSee [[susie|her]].'),
      c: entry('c', {}, '', 'infobox:\n  - title: Relationships\n    rows:\n      - { label: Partner, value: "[[susie]]" }\n'),
    })
    expect(slugs(all)).toEqual(['a', 'b', 'c'])
  })

  it('an author-only SECTION containing the link produces none', () => {
    const all = load({
      susie: target,
      zayn: entry('zayn', {}, '## Public part\n\nNothing here.\n\n## Secret {visibility=author}\n\n[[susie]]'),
      typo: entry('typo', {}, '## Typo {visibility=autor}\n\n[[susie]]'),
    })
    expect(slugs(all)).toEqual([])
  })

  it('an author-only ROW with the link produces none', () => {
    const all = load({
      susie: target,
      zayn: entry('zayn', {}, '', 'infobox:\n  - title: Secret\n    rows:\n      - { label: Lover, value: "[[susie]]", visibility: author }\n'),
    })
    expect(slugs(all)).toEqual([])
  })

  it('an author-only SOURCE produces none, and its name appears nowhere in the API answer', () => {
    const all = load({
      susie: target,
      herald: entry('herald', { name: 'Secret Herald Name', visibility: 'author' }, '## About\n\nWatches [[susie]].'),
    })
    expect(slugs(all)).toEqual([])
    const json = JSON.stringify(entryFrom(all, 'people', 'susie'))
    expect(json).not.toContain('Secret Herald Name')
    expect(json).not.toContain('herald')
  })

  it('retired sources, sources whose type has no page, and memberships do not count', () => {
    const all = load({
      susie: entry('susie', { name: 'Susie', type: 'group', kind: 'hunter-team', status: 'registered' }),
      old: entry('old', { canon: 'retired' }, '[[susie]]'),
      place: entry('place', { type: 'place' }, '[[susie]]'),
      member: entry('member', {}, '', 'memberships:\n  - { group: susie, status: current }\n'),
    })
    expect(slugs(all)).toEqual([])
  })

  it('a self-link gives nothing, and many links from one source give one backlink', () => {
    const all = load({
      susie: entry('susie', { name: 'Susie' }, 'I am [[susie]].'),
      zayn: entry('zayn', {}, 'Intro [[susie]].\n\n## A\n\n[[susie]] and [[susie|Su]].', 'infobox:\n  - title: R\n    rows:\n      - { label: P, value: "[[susie]]" }\n'),
    })
    expect(slugs(all)).toEqual(['zayn'])
  })

  it('sorts by section, then name', () => {
    const all = [
      ...load({ susie: target, b: entry('b', { name: 'Bea' }, '[[susie]]'), a: entry('a', { name: 'Ana' }, '[[susie]]') }),
      ...load({ zz: entry('zz', { name: 'Aaa Lore' }, '[[susie]]') }, 'lore'),
    ]
    expect(backlinksTo('susie', all).map((b) => `${b.section}/${b.name}`)).toEqual(['lore/Aaa Lore', 'people/Ana', 'people/Bea'])
  })

  it('a link to a non-public target gives no page at all: the endpoint answer is null (404)', () => {
    const all = load({
      secret: entry('secret', { name: 'Hidden Target', visibility: 'author' }),
      zayn: entry('zayn', {}, 'Knows [[secret]].'),
    })
    expect(entryFrom(all, 'people', 'secret')).toBeNull()
    // And the linking page shows plain text with no trace of the hidden target's name.
    const zayn = JSON.stringify(entryFrom(all, 'people', 'zayn'))
    expect(zayn).not.toContain('Hidden Target')
    expect(zayn).not.toContain('href=\\"/people/characters/secret')
  })

  it('every entry answer includes backlinks, empty when nothing links there', () => {
    const all = load({ susie: target })
    expect(entryFrom(all, 'people', 'susie')?.backlinks).toEqual([])
  })
})
