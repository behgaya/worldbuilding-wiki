<script setup lang="ts">
const route = useRoute()

// Ask the server for the entry. The URL is a function, so it re-fetches when the slug changes.
const { data: entry, error } = await useFetch(() => `/api/entries/people/${route.params.slug}`)

// The endpoint serves every type, so only show it here if it's a character (a group has its own page).
const character = computed(() => (entry.value?.type === 'character' ? entry.value : null))
const notFound = computed(() => error.value?.status === 404 || (entry.value && !character.value))

// The caption links to the character's group: their first public current membership.
const captionGroup = computed(() => (character.value ? primaryGroup(character.value.memberships) : undefined))

// Turns the server-rendered HTML (already escaped, links resolved) into plain text with paragraph breaks.
function htmlToText(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html.replace(/<\/(p|h[1-6]|pre|blockquote|ul|ol)>/g, '$&\n\n').replace(/<\/li>|<br\s*\/?>/g, '$&\n')
  return (div.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

// Everything the page shows, as readable text. Only public data is on the page, so nothing hidden is copied.
function pageAsText() {
  const c = character.value!
  const parts = [[c.name, c.title, c.caption].filter(Boolean).join('\n')]
  for (const group of c.infobox) {
    const rows = group.rows.filter((r) => r.value?.trim()).map((r) => `${r.label}: ${htmlToText(r.value!)}`)
    if (rows.length) parts.push([group.title, ...rows].join('\n'))
  }
  if (c.intro) parts.push(htmlToText(c.intro))
  for (const s of c.sections) parts.push(`${s.heading}\n\n${htmlToText(s.html)}`)
  return parts.join('\n\n')
}

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copyPage() {
  const text = pageAsText() // outside the try, so a bug here shows up instead of looking like "couldn't copy"
  try {
    await navigator.clipboard.writeText(text)
    copyState.value = 'copied'
  } catch {
    // The clipboard API needs a secure page (https or localhost) and the user's permission.
    copyState.value = 'failed'
  }
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copyState.value = 'idle'), 2000)
}
onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <main>
    <!-- Team color: a CSS variable (validated hex) for thin lines only; text keeps its colors. -->
    <article v-if="character" class="team" :style="teamStyle(character.teamColor)">
      <header>
        <div>
          <h1>{{ character.name }}</h1>
          <p v-if="character.title" class="title">{{ character.title }}</p>
          <p v-if="character.caption" class="caption">
            <NuxtLink v-if="captionGroup" :to="`/people/groups/${captionGroup}`">{{ character.caption }}</NuxtLink>
            <template v-else>{{ character.caption }}</template>
          </p>
        </div>
        <button type="button" class="copy" @click="copyPage">
          {{ copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? "Couldn't copy" : 'Copy page' }}
        </button>
        <!-- Announces the result to screen readers. -->
        <span class="visually-hidden" aria-live="polite">
          {{ copyState === 'copied' ? 'Page copied to clipboard' : copyState === 'failed' ? "Couldn't copy the page" : '' }}
        </span>
      </header>

      <EntryBody :entry="character" />
    </article>

    <EntryMissing v-else :not-found="!!notFound" kind="character" />
  </main>
</template>

<style scoped>
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1rem;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

header h1 {
  margin-bottom: 0.25rem;
}

/* A thin line under the name and title, in the character's team color (gold without one). */
header {
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--team-shade, var(--accent));
}

.copy {
  flex-shrink: 0;
  margin-top: 1.5rem;
  padding: 0.3rem 0.9rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
}

.copy:hover {
  border-color: var(--accent);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

header p {
  margin: 0;
}

.title {
  font-style: italic;
  color: var(--accent);
  font-size: 1.2rem;
}

.caption {
  color: var(--muted);
}

/* The section headings sit inside EntryBody, so reach in with :deep from the article. */
article :deep(.sections h2:first-child) {
  margin-top: 0;
}
</style>
