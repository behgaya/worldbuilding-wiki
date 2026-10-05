import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import MarkdownIt from 'markdown-it'
import { parse as parseYaml } from 'yaml'

const CANON = ['canon', 'legend', 'retired'] as const
const VISIBILITY = ['public', 'scholars', 'author'] as const
const DEVELOPMENT = ['stub', 'partial', 'developed'] as const
const MEMBERSHIP_STATUS = ['current', 'former', 'planned'] as const
const GROUP_KINDS = ['hunter-team', 'guild', 'cult', 'npc-group'] as const
const GROUP_STATUS = ['registered', 'lupin', 'unregistered', 'disbanded'] as const

type Canon = (typeof CANON)[number]
type Visibility = (typeof VISIBILITY)[number]
type GroupKind = (typeof GROUP_KINDS)[number]
type GroupStatus = (typeof GROUP_STATUS)[number]

export interface Membership {
  group: string // the group's slug, e.g. "team-vulcan"
  status: (typeof MEMBERSHIP_STATUS)[number]
}

export interface InfoRow {
  label: string
  value?: string
}

export interface Member {
  slug: string
  name: string
  title?: string
}

export interface Backlink {
  section: string
  type: string
  slug: string
  name: string
  href: string
}

// What the API sends for one entry. Only public rows and sections are left. Long text and
// infobox values are HTML rendered here with raw HTML disabled. Memberships are only current
// ones to public groups. Group-only fields are set for groups and left out otherwise.
export interface Entry {
  section: string
  type: string
  slug: string
  name: string
  title?: string
  caption?: string
  canon: Canon
  visibility: Visibility
  development: (typeof DEVELOPMENT)[number]
  memberships: Membership[]
  infobox: { title: string; rows: InfoRow[] }[]
  intro?: string
  sections: { heading: string; html: string; canon: Canon }[]
  kind?: GroupKind
  status?: GroupStatus
  order?: number
  members?: Member[]
  backlinks: Backlink[]
}

// What list pages get: enough to show, group and order an entry, never its sections or infobox.
export type EntrySummary = Pick<
  Entry,
  'slug' | 'type' | 'name' | 'title' | 'caption' | 'development' | 'canon' | 'order'
> & {
  memberships: Membership[]
}

// Section and slug come straight from the URL, so only allow simple names (blocks "../" tricks).
const SAFE_NAME = /^[a-z0-9-]+$/

// ---------------------------------------------------------------------------------------------
// Seed layout: seed/<section>/<slug>.md. The only code that knows where entries live, so the
// layout (or a database) can change here without touching anything else.
// ---------------------------------------------------------------------------------------------

const SEED_ROOT = () => join(process.cwd(), 'seed')
const ENTRY_FILE = /^([a-z0-9-]+)\.md$/ // "zayn.md" counts; "zayn.pt.md" or "notes.txt" don't
const entryPath = (section: string, slug: string) => join(SEED_ROOT(), section, `${slug}.md`)

interface SeedFile {
  section: string
  slug: string
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

// Every entry file, optionally for one section only.
async function seedFiles(onlySection?: string): Promise<SeedFile[]> {
  const sections = onlySection ? [onlySection] : (await listDir(SEED_ROOT())).filter((d) => SAFE_NAME.test(d))
  const files: SeedFile[] = []
  for (const section of sections) {
    for (const name of await listDir(join(SEED_ROOT(), section))) {
      const match = name.match(ENTRY_FILE)
      if (match) files.push({ section, slug: match[1]! })
    }
  }
  return files
}

// ---------------------------------------------------------------------------------------------
// Parsing and validation (no rendering). A RawEntry still holds Markdown source and hidden parts.
// ---------------------------------------------------------------------------------------------

export class InvalidEntry extends Error {}

export interface RawEntry {
  section: string
  slug: string
  type: string
  name: string
  title?: string
  caption?: string
  canon: Canon
  visibility: Visibility
  development: (typeof DEVELOPMENT)[number]
  memberships: Membership[] // all of them, including former and planned: never sent as-is
  infobox: { title: string; rows: { label: string; value?: string; visible: boolean }[] }[]
  intro: string
  sections: { heading: string; src: string; visible: boolean; canon: Canon }[]
  kind?: GroupKind
  status?: GroupStatus
  order?: number
}

const isOneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

function optionalString(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') throw new InvalidEntry(`${field} must be text (put it in quotes), got ${JSON.stringify(v)}`)
  return v
}

// Splits "---\nyaml\n---\nbody". Line endings are already normalised.
function splitFrontmatter(text: string) {
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/)
  if (!match) throw new InvalidEntry('missing --- frontmatter block at the top')
  let data: unknown
  try {
    data = parseYaml(match[1]!)
  } catch (err) {
    throw new InvalidEntry(`frontmatter is not valid YAML: ${(err as Error).message.split('\n')[0]}`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new InvalidEntry('frontmatter must be key: value pairs')
  return { data: data as Record<string, unknown>, body: match[2]! }
}

// Reads "## Heading {visibility=author canon=legend}". Any problem with the {…} part hides the section.
function parseHeading(line: string): { heading: string; visible: boolean; canon?: Canon } {
  const raw = line.slice(3).trim()
  if (!raw.includes('{') && !raw.includes('}')) return { heading: raw, visible: true }

  const match = raw.match(/^(.*?)\s*\{([^{}]*)\}$/)
  if (!match) return { heading: raw, visible: false }

  const heading = match[1]!.trim()
  let visible = true
  let canon: Canon | undefined
  const parts = match[2]!.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) visible = false
  for (const part of parts) {
    const [key, value, ...rest] = part.split('=')
    if (rest.length) visible = false
    else if (key === 'visibility' && isOneOf(VISIBILITY, value)) visible &&= value === 'public'
    else if (key === 'canon' && isOneOf(CANON, value)) canon = value
    else visible = false // unknown key or value: fail closed
  }
  return { heading, visible, canon }
}

// Splits the body on top-level "## " headings only. "###" stays inside its section, and
// lines inside fenced code blocks are never headings. Text before the first heading is the intro.
function splitSections(body: string) {
  const intro: string[] = []
  const sections: { line: string; lines: string[] }[] = []
  let fence: string | null = null

  for (const line of body.split('\n')) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1]!
      if (fence === null) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
    }
    if (fence === null && !fenceMatch && /^## /.test(line)) sections.push({ line, lines: [] })
    else (sections.at(-1)?.lines ?? intro).push(line)
  }
  return { intro: intro.join('\n').trim(), sections }
}

// Group-only fields. Called only for type: group.
function parseGroupFields(data: Record<string, unknown>) {
  if (!isOneOf(GROUP_KINDS, data.kind)) throw new InvalidEntry(`kind must be one of ${GROUP_KINDS.join(', ')}`)
  if (!isOneOf(GROUP_STATUS, data.status)) throw new InvalidEntry(`status must be one of ${GROUP_STATUS.join(', ')}`)
  if (data.order !== undefined && !Number.isInteger(data.order))
    throw new InvalidEntry(`order must be a whole number, got ${JSON.stringify(data.order)}`)
  return { kind: data.kind, status: data.status, order: data.order as number | undefined }
}

// Turns one seed file into a RawEntry, or throws InvalidEntry with a reason. Pure: no file access.
export function parseEntry(text: string, section: string, slug: string): RawEntry {
  const normalised = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const { data, body } = splitFrontmatter(normalised)

  if (data.slug !== slug) throw new InvalidEntry(`slug "${data.slug}" doesn't match the file name "${slug}"`)
  if (data.section !== undefined && data.section !== section)
    throw new InvalidEntry(`section "${data.section}" doesn't match the folder "${section}"`)
  if (typeof data.name !== 'string' || !data.name.trim()) throw new InvalidEntry('name is required')
  if (!isOneOf(CANON, data.canon)) throw new InvalidEntry(`canon must be one of ${CANON.join(', ')}`)
  if (!isOneOf(VISIBILITY, data.visibility)) throw new InvalidEntry(`visibility must be one of ${VISIBILITY.join(', ')}`)
  if (!isOneOf(DEVELOPMENT, data.development))
    throw new InvalidEntry(`development must be one of ${DEVELOPMENT.join(', ')}`)
  const type = optionalString(data.type, 'type') ?? ''
  const group = type === 'group' ? parseGroupFields(data) : undefined

  if (!Array.isArray(data.memberships ?? [])) throw new InvalidEntry('memberships must be a list')
  const memberships = ((data.memberships ?? []) as unknown[]).map((m, i) => {
    const { group, status } = (m ?? {}) as Record<string, unknown>
    if (typeof group !== 'string' || !SAFE_NAME.test(group))
      throw new InvalidEntry(`memberships[${i}] group must be a group slug like team-vulcan, got ${JSON.stringify(group)}`)
    if (!isOneOf(MEMBERSHIP_STATUS, status))
      throw new InvalidEntry(`memberships[${i}] status must be one of ${MEMBERSHIP_STATUS.join(', ')}`)
    return { group, status }
  })

  if (!Array.isArray(data.infobox ?? [])) throw new InvalidEntry('infobox must be a list')
  const infobox = ((data.infobox ?? []) as unknown[]).map((g, i) => {
    const { title, rows } = (g ?? {}) as Record<string, unknown>
    if (typeof title !== 'string') throw new InvalidEntry(`infobox[${i}] needs a title`)
    if (!Array.isArray(rows ?? [])) throw new InvalidEntry(`infobox "${title}" rows must be a list`)
    return {
      title,
      rows: ((rows ?? []) as unknown[]).map((r) => {
        const row = (r ?? {}) as Record<string, unknown>
        if (typeof row.label !== 'string') throw new InvalidEntry(`a row in infobox "${title}" needs a label`)
        const value = optionalString(row.value, `infobox "${title}" → ${row.label}`)
        // Fail closed: a row with a visibility other than exactly "public" is hidden.
        return { label: row.label, value, visible: row.visibility === undefined || row.visibility === 'public' }
      }),
    }
  })

  const { intro, sections } = splitSections(body)
  return {
    section,
    slug,
    type,
    name: data.name,
    title: optionalString(data.title, 'title'),
    caption: optionalString(data.caption, 'caption'),
    canon: data.canon,
    visibility: data.visibility,
    development: data.development,
    memberships,
    infobox,
    intro,
    sections: sections.map(({ line, lines }) => {
      const { heading, visible, canon } = parseHeading(line)
      return { heading, src: lines.join('\n').trim(), visible, canon: canon ?? (data.canon as Canon) }
    }),
    kind: group?.kind,
    status: group?.status,
    order: group?.order,
  }
}

export type Loaded = { ok: true; entry: RawEntry } | { ok: false; reason: string }

export interface LoadedFile {
  section: string
  slug: string
  loaded: Loaded
}

// Reads one file. null = no such file; { ok: false } = invalid, with the reason.
async function readEntry(section: string, slug: string): Promise<Loaded | null> {
  let text: string
  try {
    text = await readFile(entryPath(section, slug), 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
  try {
    return { ok: true, entry: parseEntry(text, section, slug) }
  } catch (err) {
    if (!(err instanceof InvalidEntry)) throw err
    return { ok: false, reason: err.message }
  }
}

const warnInvalid = (f: { section: string; slug: string; loaded: Loaded }) => {
  if (!f.loaded.ok) console.warn(`[entries] skipping seed/${f.section}/${f.slug}.md: ${f.loaded.reason}`)
}

// Every entry file, read and validated once. Hidden and invalid ones included: callers filter.
async function loadAll(): Promise<LoadedFile[]> {
  const all: LoadedFile[] = []
  for (const { section, slug } of await seedFiles()) {
    const loaded = await readEntry(section, slug)
    if (loaded) all.push({ section, slug, loaded })
  }
  return all
}

const validEntries = (all: LoadedFile[]) => all.flatMap((f) => (f.loaded.ok ? [f.loaded.entry] : []))

// sensitivity 'base' sorts accented names (Ênio, Túlio) with their base letter instead of after Z.
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

// ---------------------------------------------------------------------------------------------
// Entry index and [[wiki links]]. The index includes hidden entries so links can be resolved,
// but it never leaves this file: only the rendered HTML does.
// ---------------------------------------------------------------------------------------------

// Page path for each entry type that has a page. Types without one can't be linked yet.
const TYPE_PATHS: Record<string, string> = { character: 'characters', group: 'groups' }

// For ?type= on the list endpoint: only types the wiki knows about.
export const isKnownType = (type: unknown): type is string => typeof type === 'string' && Object.hasOwn(TYPE_PATHS, type)

export type LinkStatus = 'ok' | 'not-public' | 'retired' | 'no-page' | 'invalid' | 'ambiguous'

export interface IndexEntry {
  section: string
  type: string
  name: string
  status: LinkStatus // only 'ok' becomes a link
}

export type EntryIndex = Map<string, IndexEntry>

function indexStatus(entry: RawEntry): LinkStatus {
  if (entry.visibility !== 'public') return 'not-public'
  if (entry.canon === 'retired') return 'retired'
  if (!TYPE_PATHS[entry.type]) return 'no-page'
  return 'ok'
}

// Index of every entry by slug. Pure: built from already-loaded files.
export function indexFrom(all: LoadedFile[]): EntryIndex {
  const index: EntryIndex = new Map()
  for (const { section, slug, loaded } of all) {
    const item: IndexEntry = loaded.ok
      ? { section, type: loaded.entry.type, name: loaded.entry.name, status: indexStatus(loaded.entry) }
      : { section, type: '', name: '', status: 'invalid' }
    // [[slug]] is global, so a slug used in two sections can't be linked until one is renamed.
    index.set(slug, index.has(slug) ? { section, type: item.type, name: item.name, status: 'ambiguous' } : item)
  }
  return index
}

export interface ResolvedLink {
  slug: string
  text: string
  resolved: boolean
}

interface LinkEnv {
  index: EntryIndex
  links: ResolvedLink[]
}

type InlineRule = Parameters<MarkdownIt['inline']['ruler']['before']>[2]

// Inline rule for [[slug]] and [[slug|text]]. Returning false leaves the characters as plain text.
// Code spans are consumed earlier by the backtick rule and fences are block-level, so links
// inside code are never touched.
const wikiLinkRule: InlineRule = (state, silent) => {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x5b /* [ */ || state.src.charCodeAt(start + 1) !== 0x5b) return false
  const end = state.src.indexOf(']]', start + 2)
  if (end < 0 || end > state.posMax) return false
  const inner = state.src.slice(start + 2, end)
  if (/[[\]\n]/.test(inner)) return false

  const bar = inner.indexOf('|')
  const slug = (bar < 0 ? inner : inner.slice(0, bar)).trim()
  const custom = bar < 0 ? '' : inner.slice(bar + 1).trim()
  if (!slug) return false

  if (!silent) {
    const env = state.env as LinkEnv
    const target = env.index.get(slug)
    const resolved = target?.status === 'ok'
    // A hidden or missing target shows the custom text or the slug as written, never its name.
    const text = custom || (resolved ? target.name : slug)
    if (resolved) {
      const open = state.push('link_open', 'a', 1)
      // Built only from index fields, never from the text the author typed.
      open.attrs = [['href', `/${target.section}/${TYPE_PATHS[target.type]}/${slug}`]]
      state.push('text', '', 0).content = text
      state.push('link_close', 'a', -1)
    } else {
      state.push('text', '', 0).content = text
    }
    env.links.push({ slug, text, resolved })
  }
  state.pos = end + 2
  return true
}

function wikiLinks(md: MarkdownIt) {
  md.inline.ruler.before('link', 'wikilink', wikiLinkRule)
}

// html: false escapes any raw HTML in the source, so pages can show the result with v-html.
const md = new MarkdownIt({ html: false }).use(wikiLinks)
// Infobox values: plain text plus [[links]] only, so "*x*" stays "*x*".
const mdInline = new MarkdownIt('zero', { html: false }).use(wikiLinks)

// Renders Markdown with [[links]] resolved against the index. Also returns every link found,
// which backlinks can use later.
export function renderMarkdown(src: string, index: EntryIndex, options: { inline?: boolean } = {}) {
  const env: LinkEnv = { index, links: [] }
  const html = options.inline ? mdInline.renderInline(src, env) : md.render(src, env)
  return { html, links: env.links }
}

// ---------------------------------------------------------------------------------------------
// Groups and memberships. Members are derived from characters' memberships, never stored.
// ---------------------------------------------------------------------------------------------

const isPublicGroup = (index: EntryIndex, slug: string) => {
  const target = index.get(slug)
  return target?.status === 'ok' && target.type === 'group'
}

// The memberships that may be shown: current ones to public groups, in file order. Former and
// planned never leave the server, and a hidden or missing group isn't even hinted at.
export function publicMemberships(memberships: Membership[], index: EntryIndex): Membership[] {
  return memberships
    .filter((m) => m.status === 'current' && isPublicGroup(index, m.group))
    .map((m) => ({ group: m.group, status: m.status }))
}

// Public characters with a current membership to the group, sorted by name.
export function membersOf(groupSlug: string, all: LoadedFile[]): Member[] {
  return validEntries(all)
    .filter((e) => e.type === 'character' && e.visibility === 'public')
    .filter((e) => e.memberships.some((m) => m.group === groupSlug && m.status === 'current'))
    .map((e) => ({ slug: e.slug, name: e.name, title: e.title }))
    .sort(byName)
}

// Groups by `order` (ascending), ties by name, groups without an order last.
export function sortGroups<T extends { name: string; order?: number }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order
    if ((a.order === undefined) !== (b.order === undefined)) return a.order === undefined ? 1 : -1
    return byName(a, b)
  })
}

// ---------------------------------------------------------------------------------------------
// Backlinks: "pages that link here", from [[links]] only (memberships don't count).
// ---------------------------------------------------------------------------------------------

const hrefFor = (e: { section: string; type: string; slug: string }) => `/${e.section}/${TYPE_PATHS[e.type]}/${e.slug}`

// Every public entry whose PUBLIC text links to the target. Fail closed: a source counts only if
// it is public, not retired and has a page (index status 'ok'), and only links in its intro,
// public sections and public infobox rows count. Hidden sources are skipped entirely, so their
// names, counts and existence never reach the answer. One backlink per source, no self-links.
export function backlinksTo(targetSlug: string, all: LoadedFile[], index: EntryIndex = indexFrom(all)): Backlink[] {
  const backlinks: Backlink[] = []
  for (const source of validEntries(all)) {
    if (source.slug === targetSlug || index.get(source.slug)?.status !== 'ok') continue

    const publicText: { src: string; inline?: boolean }[] = [
      { src: source.intro },
      ...source.sections.filter((s) => s.visible).map((s) => ({ src: s.src })),
      ...source.infobox.flatMap((g) => g.rows.filter((r) => r.visible).map((r) => ({ src: r.value ?? '', inline: true }))),
    ]
    const linksHere = publicText.some(({ src, inline }) =>
      renderMarkdown(src, index, { inline }).links.some((l) => l.slug === targetSlug && l.resolved),
    )
    if (linksHere) {
      backlinks.push({
        section: source.section,
        type: source.type,
        slug: source.slug,
        name: source.name,
        href: hrefFor(source),
      })
    }
  }
  return backlinks.sort((a, b) => a.section.localeCompare(b.section) || byName(a, b))
}

// The public view of an entry: hidden rows and sections removed, Markdown rendered.
function renderEntry(raw: RawEntry, index: EntryIndex, all: LoadedFile[]): Entry {
  const entry: Entry = {
    section: raw.section,
    type: raw.type,
    slug: raw.slug,
    name: raw.name,
    title: raw.title,
    caption: raw.caption,
    canon: raw.canon,
    visibility: raw.visibility,
    development: raw.development,
    memberships: publicMemberships(raw.memberships, index),
    infobox: raw.infobox.map((g) => ({
      title: g.title,
      rows: g.rows
        .filter((r) => r.visible)
        .map((r) => ({
          label: r.label,
          value: r.value === undefined ? undefined : renderMarkdown(r.value, index, { inline: true }).html,
        })),
    })),
    intro: raw.intro ? renderMarkdown(raw.intro, index).html : undefined,
    sections: raw.sections
      .filter((s) => s.visible)
      .map((s) => ({ heading: s.heading, html: renderMarkdown(s.src, index).html, canon: s.canon })),
    backlinks: backlinksTo(raw.slug, all, index),
  }
  if (raw.type === 'group') {
    entry.kind = raw.kind
    entry.status = raw.status
    entry.order = raw.order
    entry.members = membersOf(raw.slug, all)
  }
  return entry
}

// ---------------------------------------------------------------------------------------------
// Public functions used by the API routes.
// ---------------------------------------------------------------------------------------------

// The API answer for one entry, from already-loaded files (pure, so tests can call it).
// null for anything missing, invalid or not public: the route turns that into the same 404.
export function entryFrom(all: LoadedFile[], section: string, slug: string): Entry | null {
  const file = all.find((f) => f.section === section && f.slug === slug)
  if (!file) return null
  warnInvalid(file)
  if (!file.loaded.ok || file.loaded.entry.visibility !== 'public') return null
  return renderEntry(file.loaded.entry, indexFrom(all), all)
}

// One entry, only if it is public. Anything else looks the same as a missing entry.
export async function getEntry(section: string, slug: string): Promise<Entry | null> {
  if (!SAFE_NAME.test(section) || !SAFE_NAME.test(slug)) return null
  return entryFrom(await loadAll(), section, slug)
}

// Public entries of a section as summaries, optionally of one type. Groups come sorted by
// `order`; everything else by name.
export async function listEntries(section: string, type?: string): Promise<EntrySummary[]> {
  if (!SAFE_NAME.test(section)) return []
  const all = await loadAll()
  const index = indexFrom(all)

  const summaries: EntrySummary[] = []
  for (const file of all.filter((f) => f.section === section)) {
    warnInvalid(file)
    if (!file.loaded.ok) continue
    const entry = file.loaded.entry
    if (entry.visibility !== 'public' || (type && entry.type !== type)) continue

    // Fields listed one by one, so nothing new slips into list responses by accident.
    summaries.push({
      slug: entry.slug,
      type: entry.type,
      name: entry.name,
      title: entry.title,
      caption: entry.caption,
      development: entry.development,
      canon: entry.canon,
      order: entry.order,
      memberships: publicMemberships(entry.memberships, index),
    })
  }
  return type === 'group' ? sortGroups(summaries) : summaries.sort(byName)
}

// ---------------------------------------------------------------------------------------------
// npm run check: every [[link]] and membership in every entry, hidden parts included.
// ---------------------------------------------------------------------------------------------

export interface LinkProblem {
  level: 'error' | 'warn'
  kind: string
  file: string
  where: string
  slug: string
}

const PROBLEM: Record<Exclude<LinkStatus, 'ok'>, { level: 'error' | 'warn'; kind: string }> = {
  invalid: { level: 'error', kind: 'target file is invalid' },
  ambiguous: { level: 'error', kind: 'slug used in two sections' },
  'not-public': { level: 'warn', kind: 'target not public' },
  retired: { level: 'warn', kind: 'target retired' },
  'no-page': { level: 'warn', kind: 'target type has no page yet' },
}

// Pure: works on already-loaded files, so tests can call it without seed files.
export function checkProblems(all: LoadedFile[]): LinkProblem[] {
  const index = indexFrom(all)
  const problems: LinkProblem[] = []

  for (const { section, slug, loaded } of all) {
    const file = `seed/${section}/${slug}.md`
    if (!loaded.ok) {
      problems.push({ level: 'error', kind: `invalid file: ${loaded.reason}`, file, where: '-', slug })
      continue
    }
    const raw = loaded.entry
    const places: { where: string; src: string; inline?: boolean }[] = [
      { where: 'intro', src: raw.intro },
      ...raw.sections.map((s) => ({ where: `## ${s.heading}`, src: s.src })),
      ...raw.infobox.flatMap((g) =>
        g.rows.map((r) => ({ where: `infobox ${g.title} → ${r.label}`, src: r.value ?? '', inline: true })),
      ),
    ]
    for (const place of places) {
      for (const link of renderMarkdown(place.src, index, { inline: place.inline }).links) {
        const target = index.get(link.slug)
        if (!target) problems.push({ level: 'error', kind: 'missing target', file, where: place.where, slug: link.slug })
        else if (target.status !== 'ok') problems.push({ ...PROBLEM[target.status], file, where: place.where, slug: link.slug })
      }
    }
    // Memberships of every status: a planned membership to a typo is still a mistake.
    for (const m of raw.memberships) {
      const target = index.get(m.group)
      const where = `memberships (${m.status})`
      if (!target) problems.push({ level: 'error', kind: 'membership group missing', file, where, slug: m.group })
      else if (target.status === 'invalid' || target.status === 'ambiguous')
        problems.push({ ...PROBLEM[target.status], file, where, slug: m.group })
      else if (target.type !== 'group') problems.push({ level: 'error', kind: 'membership target is not a group', file, where, slug: m.group })
      else if (target.status !== 'ok') problems.push({ ...PROBLEM[target.status], file, where, slug: m.group })
    }
  }
  return problems
}

export async function checkLinks(): Promise<LinkProblem[]> {
  return checkProblems(await loadAll())
}
