import { describe, expect, it } from 'vitest'
import { renderMarkdown, type EntryIndex } from '../server/utils/entries.ts'

// A hand-built index, so these tests don't depend on the seed files.
const index: EntryIndex = new Map([
  ['susie', { section: 'people', type: 'character', name: 'Susie', status: 'ok' }],
  ['emilia', { section: 'people', type: 'character', name: 'Emília', status: 'ok' }],
  ['herald', { section: 'people', type: 'character', name: 'Secret Herald Name', status: 'not-public' }],
])

const render = (src: string) => renderMarkdown(src, index).html
const renderInline = (src: string) => renderMarkdown(src, index, { inline: true }).html

describe('[[wiki links]]', () => {
  it('[[slug]] links to the entry page and shows its name', () => {
    expect(render('Partner: [[susie]].')).toBe('<p>Partner: <a href="/people/characters/susie">Susie</a>.</p>\n')
  })

  it('[[slug|text]] shows the custom text, with whitespace trimmed', () => {
    expect(render('[[ emilia | Emi ]]')).toBe('<p><a href="/people/characters/emilia">Emi</a></p>\n')
  })

  it('a link to a non-public entry is plain text with no trace of the target', () => {
    const html = render('Led by [[herald]], also [[herald|the Herald]].')
    expect(html).toBe('<p>Led by herald, also the Herald.</p>\n')
    expect(html).not.toContain('<a')
    expect(html).not.toContain('href')
    expect(html).not.toContain('Secret Herald Name')
  })

  it('a missing target is plain text: the slug as written, or the custom text', () => {
    expect(render('[[nobody]] and [[nobody|Someone]]')).toBe('<p>nobody and Someone</p>\n')
  })

  it('slug matching is exact and case-sensitive', () => {
    expect(render('[[Susie]]')).toBe('<p>Susie</p>\n')
    expect(render('[[Susie]]')).not.toContain('<a')
  })

  it('leaves [[...]] inside inline code and fenced code untouched', () => {
    expect(render('Write `[[susie]]` to link.')).toBe('<p>Write <code>[[susie]]</code> to link.</p>\n')
    expect(render('```\n[[susie]]\n```')).toBe('<pre><code>[[susie]]\n</code></pre>\n')
  })

  it('leaves malformed brackets as literal text', () => {
    expect(render('[[ ]]')).toBe('<p>[[ ]]</p>\n')
    expect(render('[[ | x]]')).toBe('<p>[[ | x]]</p>\n')
    expect(render('[[susie')).toBe('<p>[[susie</p>\n')
    expect(render('[[]]')).toBe('<p>[[]]</p>\n')
  })

  it('escapes link text containing <script> or quotes', () => {
    const html = render('[[susie|<script>alert("x")</script>]] and [[nobody|"quoted" <b>]]')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(html).toContain('&quot;quoted&quot; &lt;b&gt;')
  })

  it('returns every link found, marked resolved or not', () => {
    const { links } = renderMarkdown('[[susie]], [[herald]], [[nobody|N]]', index)
    expect(links).toEqual([
      { slug: 'susie', text: 'Susie', resolved: true },
      { slug: 'herald', text: 'herald', resolved: false },
      { slug: 'nobody', text: 'N', resolved: false },
    ])
  })
})

describe('infobox values', () => {
  it('[[slug]] in a value renders a link', () => {
    expect(renderInline('[[susie]]')).toBe('<a href="/people/characters/susie">Susie</a>')
    expect(renderInline('[[susie]] and [[herald]]')).toBe('<a href="/people/characters/susie">Susie</a> and herald')
  })

  it('a value without [[ ]] stays plain, escaped text', () => {
    expect(renderInline('1.77 m')).toBe('1.77 m')
    expect(renderInline('*not italic* <b>x</b>')).toBe('*not italic* &lt;b&gt;x&lt;/b&gt;')
  })
})
