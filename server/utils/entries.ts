import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Membership {
  group: string
  status: 'current' | 'former' | 'planned'
}

export interface Entry {
  section: string
  type: string
  slug: string
  name: string
  title?: string
  caption?: string
  canon: 'canon' | 'legend' | 'retired'
  visibility: 'public' | 'scholars' | 'author'
  development: 'stub' | 'partial' | 'developed'
  memberships?: Membership[]
  infobox: { title: string; rows: { label: string; value?: string }[] }[]
  sections: { heading: string; text: string }[]
}

// What list pages get: enough to show and group an entry, never its sections or infobox.
export type EntrySummary = Pick<Entry, 'slug' | 'name' | 'title' | 'caption' | 'development' | 'canon'> & {
  memberships: Membership[]
}

// Section and slug come straight from the URL, so only allow simple names (blocks "../" tricks).
const SAFE_NAME = /^[a-z0-9-]+$/

// The only code that knows entries are JSON files in seed/. Swap this for a database later.
const seedDir = (section: string) => join(process.cwd(), 'seed', section)

export async function getEntry(section: string, slug: string): Promise<Entry | null> {
  if (!SAFE_NAME.test(section) || !SAFE_NAME.test(slug)) return null

  const file = join(seedDir(section), `${slug}.json`)
  try {
    return JSON.parse(await readFile(file, 'utf-8')) as Entry
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

// Public entries of a section as summaries. Planned memberships are removed here, on the server.
export async function listEntries(section: string): Promise<EntrySummary[]> {
  if (!SAFE_NAME.test(section)) return []

  let files: string[]
  try {
    files = (await readdir(seedDir(section))).filter((f) => f.endsWith('.json'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }

  const summaries: EntrySummary[] = []
  for (const file of files) {
    let entry: Entry
    try {
      entry = JSON.parse(await readFile(join(seedDir(section), file), 'utf-8'))
    } catch (err) {
      console.warn(`[listEntries] skipping seed/${section}/${file}: ${(err as Error).message}`)
      continue
    }
    if (entry.visibility !== 'public') continue

    // Fields listed one by one, so nothing new slips into list responses by accident.
    summaries.push({
      slug: entry.slug,
      name: entry.name,
      title: entry.title,
      caption: entry.caption,
      development: entry.development,
      canon: entry.canon,
      memberships: (entry.memberships ?? []).filter((m) => m.status !== 'planned'),
    })
  }
  return summaries
}
