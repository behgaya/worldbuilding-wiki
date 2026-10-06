<script setup lang="ts">
// A character's bust image, with a fallback when there is none or it fails to load:
// the initials ("Zayn Alaric Wells" → "ZW") or nothing at all.
const props = defineProps<{
  src: string | null
  alt: string
  name: string
  fallback: 'initials' | 'none'
}>()

const failed = ref(false)
const img = ref<HTMLImageElement | null>(null)

// The image is in the server-rendered HTML, so it can fail before Vue attaches @error.
// Check once after mount: a finished image with no width never loaded.
onMounted(() => {
  if (img.value?.complete && !img.value.naturalWidth) failed.value = true
})
// Another character's image (e.g. after navigating): try again.
watch(() => props.src, () => (failed.value = false))

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1]![0] : ''
  return (first + last).toUpperCase()
})
</script>

<template>
  <img v-if="src && !failed" ref="img" :src="src" :alt="alt" loading="lazy" @error="failed = true" />
  <span v-else-if="fallback === 'initials'" aria-hidden="true">{{ initials }}</span>
</template>
