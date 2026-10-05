<script setup lang="ts">
import { sections } from '~/data/sections'

const startHere = [
  { label: 'TODO: first read', to: '/places/world-map' },
  { label: 'TODO: second read', to: '/lore/history' },
  { label: 'TODO: third read', to: '/people/characters' },
]
</script>

<template>
  <main>
    <h1>Worldbuilding Wiki</h1>
    <p>TODO: intro sentence one. TODO: intro sentence two.</p>

    <section>
      <h2>Sections</h2>
      <ul class="cards">
        <li v-for="s in sections" :key="s.slug">
          <NuxtLink :to="`/${s.slug}`" class="card">
            <h3>{{ s.name }}</h3>
            <p>{{ s.description }}</p>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2>Start here</h2>
      <ul>
        <li v-for="link in startHere" :key="link.to">
          <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
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

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 1rem;
}

.card {
  display: block;
  height: 100%;
  box-sizing: border-box;
  padding: 1rem;
  border: 1px solid;
  border-radius: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.card:hover,
.card:focus-visible {
  outline: 2px solid;
  outline-offset: -1px;
}

.card h3 {
  margin: 0 0 0.5rem;
}

.card p {
  margin: 0;
}
</style>
