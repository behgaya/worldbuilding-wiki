<script setup lang="ts">
// "Pages that link here". The server already removed anything hidden, so this just lists what it got.
defineProps<{
  items: { section: string; type: string; slug: string; name: string; href: string }[]
}>()
</script>

<template>
  <section v-if="items.length" class="backlinks">
    <h2>Pages that link here</h2>
    <ul>
      <li v-for="b in items" :key="b.href">
        <NuxtLink :to="b.href">{{ b.name }}</NuxtLink>
      </li>
    </ul>
  </section>
</template>
