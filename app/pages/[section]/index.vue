<script setup lang="ts">
import { sections } from '~/data/sections'

const route = useRoute()

// computed, not a plain const: Nuxt reuses this page when going from /people to /places.
const section = computed(() => sections.find((s) => s.slug === route.params.section))

useHead({ title: () => section.value?.name ?? 'Section not found' })
</script>

<template>
  <main>
    <template v-if="section">
      <h1>{{ section.name }}</h1>
      <p class="intro">{{ section.description }}</p>

      <h2>Explore</h2>
      <ul class="cards">
        <li v-for="sub in section.subsections" :key="sub.slug">
          <NuxtLink :to="`/${section.slug}/${sub.slug}`" class="card">{{ sub.name }}</NuxtLink>
        </li>
      </ul>

      <!-- The one section-specific part of this page: the nations list on /places. -->
      <PlaceNations v-if="section.slug === 'places'" />
    </template>

    <template v-else>
      <h1>Section not found</h1>
      <p>There's no section called "{{ route.params.section }}". <NuxtLink to="/">Back to the home page</NuxtLink>.</p>
    </template>
  </main>
</template>

<style scoped>
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1rem;
}

.intro {
  font-size: 1.25rem;
  font-style: italic;
  color: var(--muted);
}

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.card {
  display: block;
  height: 100%;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--font-heading);
  color: var(--ink);
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.card:hover,
.card:focus-visible {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgb(43 33 24 / 0.12);
}
</style>
