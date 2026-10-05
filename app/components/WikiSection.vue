<script setup lang="ts">
// html is rendered on the server by markdown-it with raw HTML disabled, so v-html is safe here.
defineProps<{
  heading: string
  html: string
}>()
</script>

<template>
  <section>
    <h2>{{ heading }}</h2>
    <div class="content" v-html="html" />
  </section>
</template>

<style scoped>
h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
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
