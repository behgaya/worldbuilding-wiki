<script setup lang="ts">
// The places inside this one (two levels), already filtered and ordered on the server.
interface Child {
  slug: string
  name: string
  caption?: string
  kind: string
  href: string
  children?: Child[]
}

const props = defineProps<{ items: Child[] }>()

const HEADINGS: Record<string, string> = {
  region: 'Regions',
  state: 'States',
  nation: 'Nations',
  landmass: 'Landmasses',
  world: 'Worlds',
}

// One block per kind, in the order the kinds first appear.
const blocks = computed(() => {
  const byKind = new Map<string, Child[]>()
  for (const child of props.items) {
    if (!byKind.has(child.kind)) byKind.set(child.kind, [])
    byKind.get(child.kind)!.push(child)
  }
  return [...byKind].map(([kind, items]) => ({ heading: HEADINGS[kind] ?? kind, items }))
})
</script>

<template>
  <section v-for="block in blocks" :key="block.heading" class="place-children">
    <h2>{{ block.heading }}</h2>
    <div v-for="child in block.items" :key="child.slug" class="child">
      <h3>
        <NuxtLink :to="child.href">{{ child.name }}</NuxtLink>
        <span v-if="child.caption" class="caption">{{ child.caption }}</span>
      </h3>
      <ul v-if="child.children?.length">
        <li v-for="grandchild in child.children" :key="grandchild.slug">
          <NuxtLink :to="grandchild.href">{{ grandchild.name }}</NuxtLink>
          <span v-if="grandchild.caption" class="caption">{{ grandchild.caption }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

h3 {
  margin: 1rem 0 0.25rem;
  font-size: 1.1rem;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}

.caption {
  margin-left: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: normal;
  font-style: italic;
  color: var(--muted);
}
</style>
