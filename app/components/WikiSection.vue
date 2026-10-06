<script setup lang="ts">
// html is rendered on the server by markdown-it with raw HTML disabled, so v-html is safe here.
defineProps<{
  heading: string
  html: string
}>()
</script>

<template>
  <section>
    <!-- Native collapsible: open by default, click (or Enter/Space on) the heading to toggle. -->
    <details open>
      <summary><h2>{{ heading }}</h2></summary>
      <div class="content" v-html="html" />
    </details>
  </section>
</template>

<style scoped>
summary {
  list-style: none; /* hide the browser's own triangle... */
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none; /* ...including Safari's */
}

h2 {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

/* Our own arrow: points right when closed, down when open. */
h2::before {
  content: '▸';
  font-size: 0.8em;
  color: var(--accent);
  transition: transform 0.2s;
}

details[open] h2::before {
  transform: rotate(90deg);
}

summary:hover h2 {
  color: var(--accent);
}

/* v-html content isn't scoped, so :deep reaches the rendered Markdown. */
.content :deep(h3) {
  margin: 1.25rem 0 0.25rem;
  font-size: 1.1rem;
}

.content :deep(blockquote) {
  margin: 1rem 0;
  padding-left: 1rem;
  border-left: 3px solid var(--border);
  color: var(--muted);
}
</style>
