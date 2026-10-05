<script setup lang="ts">
const route = useRoute()

// Ask the server for the entry. The URL is a function, so it re-fetches when the slug changes.
const { data: character, error } = await useFetch(() => `/api/entries/people/${route.params.slug}`)
</script>

<template>
  <main>
    <article v-if="character">
      <header>
        <h1>{{ character.name }}</h1>
        <p v-if="character.title" class="title">{{ character.title }}</p>
        <p class="caption">{{ character.caption }}</p>
      </header>

      <div class="layout">
        <InfoBox class="infobox" :title="character.name" :groups="character.infobox" />
        <div class="sections">
          <WikiSection v-for="s in character.sections" :key="s.heading" v-bind="s" />
        </div>
      </div>
    </article>

    <template v-else-if="error?.status === 404">
      <h1>Entry not found</h1>
      <p>No character with the slug "{{ route.params.slug }}".</p>
    </template>

    <template v-else>
      <h1>Couldn't load this entry</h1>
      <p>Something went wrong. Try reloading the page.</p>
    </template>
  </main>
</template>

<style scoped>
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1rem;
}

header h1 {
  margin-bottom: 0.25rem;
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

.layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Infobox comes first in the markup (read first on mobile), shown on the right on wide screens.
   Only split into two columns when an infobox was actually rendered. */
@media (min-width: 768px) {
  .layout:has(.infobox) {
    grid-template-columns: 1fr 18rem;
    grid-template-areas: 'sections infobox';
    align-items: start;
  }

  .layout:has(.infobox) .infobox {
    grid-area: infobox;
  }

  /* Guarded too: a grid-area naming an area that isn't defined adds an extra implicit column. */
  .layout:has(.infobox) .sections {
    grid-area: sections;
  }
}

.sections :deep(h2):first-child {
  margin-top: 0;
}
</style>
