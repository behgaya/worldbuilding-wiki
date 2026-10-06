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

      <EntryBody :entry="place">
        <template #after-sections>
          <PlaceChildren :items="place.children ?? []" />
        </template>
      </EntryBody>
    </article>

    <EntryMissing v-else :not-found="!!notFound" kind="place" />
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
</style>
