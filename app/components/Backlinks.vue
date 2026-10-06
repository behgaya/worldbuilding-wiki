<script setup lang="ts">
// "Pages that link here". The server already removed anything hidden, so this just lists what it got.
// Shown as a quiet footer: collapsed by default, names on one line.
defineProps<{
  items: { section: string; type: string; slug: string; name: string; href: string }[]
}>()
</script>

<template>
  <footer v-if="items.length" class="backlinks">
    <details>
      <summary><h2>Pages that link here ({{ items.length }})</h2></summary>
      <ul>
        <li v-for="b in items" :key="b.href">
          <NuxtLink :to="b.href">{{ b.name }}</NuxtLink>
        </li>
      </ul>
    </details>
  </footer>
</template>

<style scoped>
.backlinks {
  margin-top: 2.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.9rem;
  color: var(--muted);
}

summary {
  list-style: none;
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none;
}

h2 {
  display: inline;
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0;
}

/* Small arrow, as on the sections: right when closed, down when open. */
h2::before {
  content: '▸';
  display: inline-block;
  margin-right: 0.35rem;
  transition: transform 0.2s;
}

details[open] h2::before {
  transform: rotate(90deg);
}

summary:hover {
  color: var(--accent);
}

/* One compact line: "Emília Ada Shelley · Team Vulcan". */
ul {
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

li {
  display: inline;
}

li + li::before {
  content: ' · ';
}

a {
  color: var(--muted);
}

a:hover {
  color: var(--accent);
}
</style>
