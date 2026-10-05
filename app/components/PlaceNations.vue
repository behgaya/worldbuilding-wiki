<script setup lang="ts">
// Nations on the Places landing page. Public places only, already sorted by order, then name.
const { data: places } = await useFetch('/api/entries/places', { query: { type: 'place' } })
const nations = computed(() => (places.value ?? []).filter((p) => p.kind === 'nation'))
</script>

<template>
  <section v-if="nations.length">
    <h2>Nations</h2>
    <ul>
      <li v-for="n in nations" :key="n.slug">
        <NuxtLink :to="`/places/${n.slug}`">{{ n.name }}</NuxtLink>
        <span v-if="n.caption" class="caption">{{ n.caption }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.caption {
  margin-left: 0.5rem;
  font-style: italic;
  color: var(--muted);
}
</style>
