<script setup lang="ts">
// The body shared by every entry page: infobox, intro, sections and backlinks.
// Pages add their own parts through two slots: #after-intro (e.g. a group's members) and
// #after-sections (e.g. a place's regions and states).
interface InfoGroup {
  title: string
  rows: { label: string; value?: string }[]
}

defineProps<{
  entry: {
    name: string
    infobox: InfoGroup[]
    intro?: string
    sections: { heading: string; html: string }[]
    backlinks: { section: string; type: string; slug: string; name: string; href: string }[]
    images?: { full: string | null; alt: string | null } // characters only
  }
}>()
</script>

<template>
  <div class="layout">
    <InfoBox
      class="infobox"
      :title="entry.name"
      :groups="entry.infobox"
      :image="entry.images?.full ? { src: entry.images.full, alt: entry.images.alt ?? entry.name } : null"
    />
    <div class="sections">
      <!-- Intro and sections are HTML rendered on the server with raw HTML disabled. -->
      <div v-if="entry.intro" class="intro" v-html="entry.intro" />
      <slot name="after-intro" />
      <WikiSection v-for="s in entry.sections" :key="s.heading" :heading="s.heading" :html="s.html" />
      <slot name="after-sections" />
      <Backlinks :items="entry.backlinks" />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Infobox comes first in the markup (read first on mobile), shown on the right on wide screens.
   Only split into two columns when an infobox was actually rendered. */
@media (min-width: 768px) {
  .layout:has(.infobox) {
    grid-template-columns: 1fr 18rem;
    grid-template-areas: 'sections infobox';
    align-items: start;
  }

  .layout:has(.infobox) .infobox {
    grid-area: infobox;
  }

  /* Guarded too: a grid-area naming an area that isn't defined adds an extra implicit column. */
  .layout:has(.infobox) .sections {
    grid-area: sections;
  }
}

.intro {
  font-size: 1.15rem;
}

.intro :deep(p:first-child) {
  margin-top: 0;
}
</style>
