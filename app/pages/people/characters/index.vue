<script setup lang="ts">
const route = useRoute()
const { data: characters } = await useFetch('/api/entries/people', { query: { type: 'character' } })
// Public groups, already in display order (by `order`, then name).
const { data: groupList } = await useFetch('/api/entries/people', { query: { type: 'group' } })

type Character = NonNullable<typeof characters.value>[number]

// Both choices live in the URL. Anything unexpected falls back to the default.
// ?group=none shows one flat list; otherwise characters are grouped by team.
const mode = computed(() => (route.query.group === 'none' ? 'none' : 'team'))
// ?view=grid shows cards with a portrait; otherwise the compact list.
const view = computed(() => (route.query.view === 'grid' ? 'grid' : 'list'))

// sensitivity 'base' sorts accented names (Ênio, Túlio) with their base letter instead of after Z.
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

const UNAFFILIATED = 'Unaffiliated'

const sorted = computed(() => [...(characters.value ?? [])].sort((a, b) => byName(a.name, b.name)))

interface Block {
  key: string
  name: string
  href?: string
  color?: string | null // the group's team color, for the accent bar under the heading
  members: Character[]
}

const groups = computed(() => {
  // Each character appears once, under their primary group (first public current membership).
  const bySlug = new Map<string, Character[]>()
  for (const c of sorted.value) {
    const slug = primaryGroup(c.memberships) ?? ''
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug)!.push(c)
  }
  // Headings follow the group list's order and link to the group page.
  const blocks: Block[] = []
  for (const g of groupList.value ?? []) {
    const members = bySlug.get(g.slug)
    if (members) blocks.push({ key: g.slug, name: g.name, href: `/people/groups/${g.slug}`, color: g.color, members: byTeamOrder(members, g.slug) })
    bySlug.delete(g.slug)
  }
  // No group, or a group this list doesn't know: Unaffiliated, always last.
  const rest = [...bySlug.values()].flat().sort((a, b) => byName(a.name, b.name))
  if (rest.length) blocks.push({ key: 'unaffiliated', name: UNAFFILIATED, members: rest })
  return blocks
})

// Inside a team: by each character's membership `order` for that team (leader first), then by
// name; those without an order come after, still by name. The input is already sorted by name.
function byTeamOrder(members: Character[], groupSlug: string) {
  const orderIn = (c: Character) => c.memberships.find((m) => m.group === groupSlug)?.order
  return [...members].sort((a, b) => {
    const oa = orderIn(a)
    const ob = orderIn(b)
    if (oa === undefined || ob === undefined) return oa === ob ? 0 : oa === undefined ? 1 : -1
    return oa - ob
  })
}

// What the template renders: one block per team, or a single unnamed block for A to Z.
const blocks = computed<Block[]>(() =>
  mode.value === 'team' ? groups.value : [{ key: 'all', name: '', members: sorted.value }],
)

// Switch links change one setting and keep the other.
const withQuery = (key: 'group' | 'view', value: string) => ({ query: { ...route.query, [key]: value } })
</script>

<template>
  <main>
    <h1>Characters</h1>

    <div class="switches">
      <nav class="switch" aria-label="Grouping">
        <NuxtLink :to="withQuery('group', 'team')" :aria-current="mode === 'team' ? 'page' : undefined">
          By team
        </NuxtLink>
        <NuxtLink :to="withQuery('group', 'none')" :aria-current="mode === 'none' ? 'page' : undefined">
          A to Z
        </NuxtLink>
      </nav>
      <nav class="switch" aria-label="Layout">
        <NuxtLink :to="withQuery('view', 'list')" :aria-current="view === 'list' ? 'page' : undefined">
          List
        </NuxtLink>
        <NuxtLink :to="withQuery('view', 'grid')" :aria-current="view === 'grid' ? 'page' : undefined">
          Grid
        </NuxtLink>
      </nav>
    </div>

    <p v-if="!sorted.length">No characters yet.</p>

    <section v-for="b in blocks" v-else :key="b.key">
      <!-- Team colors are set as a CSS variable only (validated hex), and used for lines, not text. -->
      <h2 v-if="b.name" class="team" :style="teamStyle(b.color)">
        <NuxtLink v-if="b.href" :to="b.href">{{ b.name }}</NuxtLink>
        <template v-else>{{ b.name }}</template>
      </h2>
      <ul :class="view">
        <li v-for="c in b.members" :key="c.slug">
          <NuxtLink :to="`/people/characters/${c.slug}`" class="item team" :style="teamStyle(c.teamColor)">
            <!-- Bust image, or the initials when there is none (or it fails to load). -->
            <CharacterPortrait
              v-if="view === 'grid'"
              class="portrait"
              :src="c.bust"
              :alt="c.alt ?? c.name"
              :name="c.name"
              fallback="initials"
            />
            <CharacterPortrait v-else class="thumb" :src="c.bust" :alt="c.alt ?? c.name" :name="c.name" fallback="none" />
            <span class="name">{{ c.name }}</span>
            <span v-if="c.title" class="title">{{ c.title }}</span>
            <span v-if="c.caption" class="caption">{{ c.caption }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1rem;
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin-bottom: 1.5rem;
}

.switch {
  display: flex;
  gap: 0.5rem;
}

.switch a {
  padding: 0.2rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--ink);
  text-decoration: none;
}

.switch a[aria-current='page'] {
  border-color: var(--accent);
  font-weight: 600;
}

h2 {
  position: relative;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

/* A short bar in the team's color under the heading (gold for Unaffiliated). */
h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 3rem;
  height: 2px;
  background: var(--team-shade, var(--accent));
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  height: 100%;
  padding: 0.6rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--ink);
  text-decoration: none;
}

.item:hover,
.item:focus-visible {
  border-color: var(--accent);
}

.name {
  font-weight: 600;
}

.title {
  font-style: italic;
  color: var(--accent);
}

.caption {
  margin-left: auto;
  color: var(--muted);
}

/* Grid: teammates side by side as cards, each with a square portrait on top. */
ul.grid {
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 1rem;
}

.grid .item {
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  text-align: center;
  border: 2px solid var(--team-shade, var(--border)); /* the team's color, neutral without one */
}

.grid .item:hover,
.grid .item:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgb(43 33 24 / 0.12);
}

.portrait {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  margin-bottom: 0.5rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--font-heading);
  font-size: 2.5rem;
  color: var(--accent);
}

/* Initials: outline in the team color, letters mixed toward the text color. */
span.portrait {
  border-color: var(--team-shade, var(--accent));
  color: color-mix(in srgb, var(--team-shade, var(--accent)) 70%, var(--ink));
}

/* A real bust fills the square, cropped from the top so the face stays in view. */
img.portrait {
  display: block;
  object-fit: cover;
  object-position: top center;
}

/* List view: a small round bust before the name (nothing when there's no image). */
.thumb {
  align-self: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--team-shade, var(--accent));
  object-fit: cover;
  object-position: top center;
}

.grid .caption {
  margin-left: 0;
  font-size: 0.9rem;
}
</style>
