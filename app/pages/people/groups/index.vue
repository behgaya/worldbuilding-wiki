<script setup lang="ts">
// Public groups, already sorted on the server: by `order`, ties by name, no order last.
const { data: groups } = await useFetch('/api/entries/people', { query: { type: 'group' } })

useHead({ title: 'Groups' })
</script>

<template>
  <main>
    <h1>Groups</h1>

    <p v-if="!groups?.length">No groups yet.</p>

    <ul v-else class="cards">
      <li v-for="g in groups" :key="g.slug">
        <NuxtLink :to="`/people/groups/${g.slug}`" class="card">
          <span class="name">{{ g.name }}</span>
          <span v-if="g.caption" class="caption">{{ g.caption }}</span>
        </NuxtLink>
      </li>
    </ul>
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
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  height: 100%;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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

.name {
  font-family: var(--font-heading);
  font-size: 1.15rem;
}

.caption {
  color: var(--muted);
}
</style>
