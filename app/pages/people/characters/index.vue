<script setup lang="ts">
const route = useRoute()
const { data: characters } = await useFetch('/api/entries/people')

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

const groups = computed(() => {
  const map = new Map<string, Character[]>()
  for (const c of sorted.value) {
    // The first current membership in the array's order decides the group, so a character
    // with two current memberships lands somewhere predictable until groups get an order field.
    const group = c.memberships.find((m) => m.status === 'current')?.group ?? UNAFFILIATED
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(c)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === UNAFFILIATED ? 1 : b === UNAFFILIATED ? -1 : byName(a, b)))
    .map(([name, members]) => ({ name, members }))
})

// What the template renders: one block per team, or a single unnamed block for A to Z.
const blocks = computed(() => (mode.value === 'team' ? groups.value : [{ name: '', members: sorted.value }]))

// Placeholder portrait until images exist: first and last initials ("Zayn Alaric Wells" → "ZW").
function initials(name: string) {
  const words = name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1]![0] : ''
  return (first + last).toUpperCase()
}

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

    <section v-for="b in blocks" v-else :key="b.name">
      <h2 v-if="b.name">{{ b.name }}</h2>
      <ul :class="view">
        <li v-for="c in b.members" :key="c.slug">
          <NuxtLink :to="`/people/characters/${c.slug}`" class="item">
            <span v-if="view === 'grid'" class="portrait" aria-hidden="true">{{ initials(c.name) }}</span>
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
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
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

.grid .caption {
  margin-left: 0;
  font-size: 0.9rem;
}
</style>
