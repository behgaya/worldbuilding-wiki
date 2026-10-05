<script setup lang="ts">
defineProps<{
  heading: string
  text: string
}>()
</script>

<template>
  <section>
    <h2>{{ heading }}</h2>
    <p>{{ text }}</p>
  </section>
</template>

<style scoped>
h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}
</style>
