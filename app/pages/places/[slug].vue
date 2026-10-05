<script setup lang="ts">
const route = useRoute()

// The same endpoint as other entries; it serves any public entry.
const { data: entry, error } = await useFetch(() => `/api/entries/places/${route.params.slug}`)

// Only show it here if it's a place.
const place = computed(() => (entry.value?.type === 'place' ? entry.value : null))
const notFound = computed(() => error.value?.status === 404 || (entry.value && !place.value))

// The server sends the breadcrumb nearest first; show it top-down (Zhoter › North).
const crumbs = computed(() => [...(place.value?.breadcrumb ?? [])].reverse())

useHead({ title: () => place.value?.name ?? 'Entry not found' })
</script>

<template>
  <main>
    <article v-if="place">
      <nav v-if="crumbs.length" class="breadcrumb" aria-label="Breadcrumb">
        <template v-for="(c, i) in crumbs" :key="c.slug">
          <NuxtLink :to="c.href">{{ c.name }}</NuxtLink>
          <span v-if="i < crumbs.length - 1" aria-hidden="true"> › </span>
        </template>
      </nav>

      <header>
        <h1>{{ place.name }}</h1>
        <p v-if="place.caption" class="caption">{{ place.caption }}</p>
      </header>

      <div class="layout">
        <InfoBox class="infobox" :title="place.name" :groups="place.infobox" />
        <div class="sections">
          <!-- Intro and sections are HTML rendered on the server with raw HTML disabled. -->
          <div v-if="place.intro" class="intro" v-html="place.intro" />
          <WikiSection v-for="s in place.sections" :key="s.heading" :heading="s.heading" :html="s.html" />
          <PlaceChildren :items="place.children ?? []" />
          <Backlinks :items="place.backlinks" />
        </div>
      </div>
    </article>

    <template v-else-if="notFound">
      <h1>Entry not found</h1>
      <p>No place with the slug "{{ route.params.slug }}".</p>
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

.breadcrumb {
  color: var(--muted);
  font-size: 0.95rem;
}

header h1 {
  margin-bottom: 0.25rem;
}

header p {
  margin: 0;
}

.caption {
  font-style: italic;
  color: var(--muted);
}

.layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Same layout as the character page: infobox on the right when there is one. */
@media (min-width: 768px) {
  .layout:has(.infobox) {
    grid-template-columns: 1fr 18rem;
    grid-template-areas: 'sections infobox';
    align-items: start;
  }

  .layout:has(.infobox) .infobox {
    grid-area: infobox;
  }

  .layout:has(.infobox) .sections {
    grid-area: sections;
  }
}

.intro {
  font-size: 1.15rem;
}

.intro :deep(p:first-child) {
  margin-top: 0;
}
</style>
