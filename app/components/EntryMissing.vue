<script setup lang="ts">
// Shown when an entry page has nothing to display: either the entry doesn't exist (or isn't
// public, which looks the same), or the request failed for some other reason.
defineProps<{
  notFound: boolean
  kind: string // "character", "group", "place": used in the message
}>()

const route = useRoute()
</script>

<template>
  <template v-if="notFound">
    <h1>Entry not found</h1>
    <p>No {{ kind }} with the slug "{{ route.params.slug }}".</p>
  </template>

  <template v-else>
    <h1>Couldn't load this entry</h1>
    <p>Something went wrong. Try reloading the page.</p>
  </template>
</template>
