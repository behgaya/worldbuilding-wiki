import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  checkMedia,
  contentTypeFor,
  entryFrom,
  membersOf,
  parseEntry,
  resolveMedia,
  safeMediaPath,
  summariesFrom,
  type LoadedFile,
} from '../server/utils/entries.ts'

// Builds a seed file's text from frontmatter lines.
const file = (lines: string[], body = '') => `---\n${lines.join('\n')}\n---\n${body}`

const character = (slug: string, name: string, extra: string[] = [], visibility = 'public', canon = 'canon', body = '') =>
  file(
    [
      `slug: ${slug}`,
      'type: character',
      `name: ${name}`,
      `canon: ${canon}`,
      `visibility: ${visibility}`,
      'development: stub',
      ...extra,
    ],
    body,
  )

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

// images: block lines from a map, e.g. { bust: 'bust.webp' }.
const images = (fields: Record<string, string>) => ['images:', ...Object.entries(fields).map(([k, v]) => `  ${k}: ${v}`)]

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

describe('images frontmatter', () => {
  it('accepts plain filenames and an optional alt', () => {
    const entry = parseEntry(character('zayn', 'Zayn', images({ bust: 'bust.webp', full: 'Full-Body.v2.PNG', alt: 'Zayn in a cape' })), 'people', 'zayn')
    expect(entry.images).toEqual({ bust: 'bust.webp', full: 'Full-Body.v2.PNG', alt: 'Zayn in a cape' })
  })

  it.each([
    ['unsafe characters', 'bust image.webp'],
    ['a slash', 'zayn/bust.webp'],
    ['a backslash', '"zayn\\\\bust.webp"'],
    ['path traversal', '../x.webp'],
    ['a leading dot', '.bust.webp'],
    ['a bad extension', 'bust.gif'],
    ['no extension', 'bust'],
  ])('rejects %s', (_label, name) => {
    expect(reason(character('zayn', 'Zayn', images({ bust: name })), 'zayn')).toMatch(/images\.bust must be a plain filename/)
  })

  it('rejects a non-text alt, an unknown field and a list', () => {
    expect(reason(character('zayn', 'Zayn', images({ alt: '42' })), 'zayn')).toMatch(/images\.alt must be text/)
    expect(reason(character('zayn', 'Zayn', images({ bsut: 'bust.webp' })), 'zayn')).toMatch(/unknown field "bsut"/)
    expect(reason(character('zayn', 'Zayn', ['images:', '  - bust.webp']), 'zayn')).toMatch(/images must be key: value/)
  })

  it('parses images on a non-character, but never serves them and check warns', () => {
    const all = load({ crew: group('crew', images({ bust: 'bust.webp' })) })
    expect(all[0]!.loaded.ok).toBe(true)
    expect(resolveMedia(all[0], 'bust', 'crew')).toBeNull()
    expect(entryFrom(all, 'people', 'crew')!.images).toBeUndefined()
    const problems = checkMedia(all, new Map([['crew', ['bust.webp']]]))
    expect(problems).toContainEqual(expect.objectContaining({ level: 'warn', kind: 'images on a non-character (not served)' }))
  })
})

describe('resolveMedia', () => {
  const all = load({
    pub: character('pub', 'Pub', images({ bust: 'b.webp', full: 'f.png' })),
    author: character('author', 'Author', images({ bust: 'b.webp' }), 'author'),
    scholars: character('scholars', 'Scholars', images({ bust: 'b.webp' }), 'scholars'),
    typo: character('typo', 'Typo', images({ bust: 'b.webp' }), 'pubic'),
    retired: character('retired', 'Retired', images({ bust: 'b.webp' }), 'public', 'retired'),
    bad: character('bad', 'Bad', images({ bust: '../b.webp' })),
    none: character('none', 'None'),
  })
  const get = (slug: string) => all.find((f) => f.slug === slug)

  it('gives the frontmatter filename for a public character', () => {
    expect(resolveMedia(get('pub'), 'bust', 'pub')).toBe('b.webp')
    expect(resolveMedia(get('pub'), 'full', 'pub')).toBe('f.png')
  })

  it('gives null for hidden, retired, invalid or missing entries and unset fields', () => {
    for (const slug of ['author', 'scholars', 'typo', 'retired', 'bad', 'none']) {
      expect(resolveMedia(get(slug), 'bust', slug)).toBeNull()
    }
    expect(get('typo')!.loaded.ok).toBe(false) // a typo in visibility makes the file invalid
    expect(get('bad')!.loaded.ok).toBe(false)
    expect(resolveMedia(undefined, 'bust', 'ghost')).toBeNull()
  })

  it('never takes the filename from the URL', () => {
    expect(resolveMedia(get('pub'), 'other', 'pub')).toBeNull()
    expect(resolveMedia(get('pub'), 'b.webp', 'pub')).toBeNull()
    expect(resolveMedia(get('pub'), '../bust', 'pub')).toBeNull()
    expect(resolveMedia(get('pub'), 'bust', '../pub')).toBeNull()
    expect(resolveMedia(get('pub'), 'bust', 'other')).toBeNull() // slug must match the entry
  })
})

describe('contentTypeFor', () => {
  it('uses the lowercased extension', () => {
    expect(contentTypeFor('bust.webp')).toBe('image/webp')
    expect(contentTypeFor('Bust.PNG')).toBe('image/png')
    expect(contentTypeFor('x.JPG')).toBe('image/jpeg')
    expect(contentTypeFor('x.jpeg')).toBe('image/jpeg')
    expect(contentTypeFor('x.gif')).toBeNull()
  })
})

describe('safeMediaPath', () => {
  let root: string
  let outside: string

  beforeAll(async () => {
    const base = await mkdtemp(join(tmpdir(), 'wiki-media-'))
    root = join(base, 'media')
    outside = join(base, 'outside')
    await mkdir(join(root, 'zayn'), { recursive: true })
    await mkdir(outside)
    await writeFile(join(root, 'zayn', 'bust.webp'), 'x')
    await writeFile(join(outside, 'secret.webp'), 'x')
    await writeFile(join(root, 'other.webp'), 'x')
  })
  afterAll(async () => {
    await rm(join(root, '..'), { recursive: true, force: true })
  })

  it('finds a real file in the entry folder', async () => {
    expect(await safeMediaPath(root, 'zayn', 'bust.webp')).toMatch(/bust\.webp$/)
  })

  it('gives null for a missing file or a missing folder', async () => {
    expect(await safeMediaPath(root, 'zayn', 'full.webp')).toBeNull()
    expect(await safeMediaPath(root, 'nobody', 'bust.webp')).toBeNull()
  })

  it('never leaves the entry folder through ..', async () => {
    expect(await safeMediaPath(root, 'zayn', '../other.webp')).toBeNull()
    expect(await safeMediaPath(root, 'zayn', '../../outside/secret.webp')).toBeNull()
    expect(await safeMediaPath(root, '..', 'outside/secret.webp')).toBeNull()
  })

  it('never follows a symlink out of the folder', async (ctx) => {
    try {
      await symlink(join(outside, 'secret.webp'), join(root, 'zayn', 'link.webp'))
      await symlink(outside, join(root, 'linked'), 'junction')
    } catch {
      ctx.skip() // Windows may refuse to create symlinks without developer mode
    }
    expect(await safeMediaPath(root, 'zayn', 'link.webp')).toBeNull()
    expect(await safeMediaPath(root, 'linked', 'secret.webp')).toBeNull()
  })
})

describe('API shape', () => {
  const all = load({
    bust: character('bust', 'Bust Only', images({ bust: 'b.webp' })),
    full: character('full', 'Full', images({ full: 'f.webp', alt: 'Full in armour' })),
    plain: character('plain', 'Plain'),
    old: character('old', 'Old', images({ bust: 'b.webp' }), 'public', 'retired'),
  })

  it('sends URLs for set fields and null for the rest', () => {
    expect(entryFrom(all, 'people', 'bust')!.images).toEqual({ bust: '/api/media/bust/bust', full: null, alt: 'Bust Only' })
    expect(entryFrom(all, 'people', 'full')!.images).toEqual({ bust: null, full: '/api/media/full/full', alt: 'Full in armour' })
  })

  it('sends all null without an images block', () => {
    expect(entryFrom(all, 'people', 'plain')!.images).toEqual({ bust: null, full: null, alt: null })
  })

  it('sends no URL for a retired character (the route would 404 it)', () => {
    expect(entryFrom(all, 'people', 'old')!.images).toEqual({ bust: null, full: null, alt: 'Old' })
  })

  it('gives list summaries bust and alt only', () => {
    const list = summariesFrom(all, 'people', 'character')
    expect(list.find((s) => s.slug === 'bust')).toMatchObject({ bust: '/api/media/bust/bust', alt: 'Bust Only' })
    expect(list.find((s) => s.slug === 'plain')).toMatchObject({ bust: null, alt: null })
    expect(JSON.stringify(list)).not.toMatch(/b\.webp|f\.webp|\/full"/)
  })

  it('gives group members their bust', () => {
    const withGroup = load({
      crew: group('crew'),
      a: character('a', 'A', [...images({ bust: 'a.webp' }), 'memberships:', '  - { group: crew, status: current }']),
      b: character('b', 'B', ['memberships:', '  - { group: crew, status: current }']),
    })
    expect(membersOf('crew', withGroup).map((m) => m.bust)).toEqual(['/api/media/a/bust', null])
  })
})

describe('hidden characters leave no trace', () => {
  // A hidden member of a public group, with images, linking to a public page (so it would be a
  // backlink if it were public).
  const all = load({
    crew: group('crew'),
    target: character('target', 'Target'),
    ghost: character(
      'ghost',
      'Secret Ghost Name',
      [
        ...images({ bust: 'ghost-bust.webp', full: 'ghost-full.webp', alt: 'Ghost alt text' }),
        'memberships:',
        '  - { group: crew, status: current }',
      ],
      'author',
      'canon',
      'See [[target]].',
    ),
  })

  const outputs = () =>
    JSON.stringify([
      summariesFrom(all, 'people'),
      summariesFrom(all, 'people', 'character'),
      entryFrom(all, 'people', 'crew'),
      entryFrom(all, 'people', 'target'),
      entryFrom(all, 'people', 'ghost'),
      membersOf('crew', all),
    ])

  it('appears in no list, member list, backlink or entry answer', () => {
    expect(all.find((f) => f.slug === 'ghost')!.loaded.ok).toBe(true) // valid, just hidden
    const out = outputs()
    for (const secret of ['Secret Ghost Name', 'ghost-bust', 'ghost-full', 'Ghost alt text', '/api/media/ghost', '"ghost"']) {
      expect(out).not.toContain(secret)
    }
  })

  it('is not served by the media route', () => {
    const ghost = all.find((f) => f.slug === 'ghost')
    expect(resolveMedia(ghost, 'bust', 'ghost')).toBeNull()
    expect(resolveMedia(ghost, 'full', 'ghost')).toBeNull()
  })
})

describe('checkMedia', () => {
  const all = load({
    zayn: character('zayn', 'Zayn', images({ bust: 'bust.webp', full: 'full.webp' })),
    kai: character('kai', 'Kai', images({ bust: 'bust.webp' })),
    susie: character('susie', 'Susie', images({ full: 'full.png' })),
  })
  const listing = new Map([
    ['zayn', ['bust.webp', 'full.webp', 'bust-old.webp']],
    ['kai', []],
    ['susie', ['Full.png']],
    ['nobody', ['x.webp']],
  ])
  const problems = checkMedia(all, listing)
  const find = (kind: RegExp, file: string) => problems.filter((p) => kind.test(p.kind) && p.file === file)

  it('warns about a missing file, with entry, field and filename', () => {
    expect(find(/missing/, 'seed/people/kai.md')).toEqual([
      expect.objectContaining({ level: 'warn', where: 'images.bust', slug: 'bust.webp', plain: true }),
    ])
  })

  it('warns once about a case-only mismatch, not also as missing or unreferenced', () => {
    expect(find(/case differs \(on disk: Full\.png\)/, 'seed/people/susie.md')).toHaveLength(1)
    expect(problems.filter((p) => p.file.includes('susie') && !/case differs/.test(p.kind))).toEqual([])
  })

  it('warns about a folder with no entry and an unreferenced file', () => {
    expect(find(/no matching entry/, 'media/nobody/')).toHaveLength(1)
    expect(find(/not referenced/, 'media/zayn/bust-old.webp')).toHaveLength(1)
  })

  it('only warns, never errors, and is quiet when everything matches', () => {
    expect(problems.every((p) => p.level === 'warn')).toBe(true)
    expect(problems.filter((p) => p.file.includes('zayn') && !/not referenced/.test(p.kind))).toEqual([])
  })
})
