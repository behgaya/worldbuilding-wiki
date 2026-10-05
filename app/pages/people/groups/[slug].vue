<script setup lang="ts">
const route = useRoute()

// The same endpoint as characters; it serves any public entry.
const { data: entry, error } = await useFetch(() => `/api/entries/people/${route.params.slug}`)

// Only show it here if it's a group (a character has its own page).
const group = computed(() => (entry.value?.type === 'group' ? entry.value : null))
const notFound = computed(() => error.value?.status === 404 || (entry.value && !group.value))

useHead({ title: () => group.value?.name ?? 'Entry not found' })
</script>

<template>
  <main>
    <article v-if="group">
      <header>
        <h1>{{ group.name }}</h1>
        <p v-if="group.title" class="title">{{ group.title }}</p>
        <p v-if="group.caption" class="caption">{{ group.caption }}</p>
      </header>

      <div class="layout">
        <InfoBox class="infobox" :title="group.name" :groups="group.infobox" />
        <div class="sections">
          <!-- Intro and sections are HTML rendered on the server with raw HTML disabled. -->
          <div v-if="group.intro" class="intro" v-html="group.intro" />

          <!-- Members are derived on the server from characters' current memberships. -->
          <section v-if="group.members?.length" class="members">
            <h2>Members</h2>
            <ul>
              <li v-for="m in group.members" :key="m.slug">
                <NuxtLink :to="m.href">{{ m.name }}</NuxtLink>
                <span v-if="m.title" class="member-title">{{ m.title }}</span>
              </li>
            </ul>
          </section>

          <WikiSection v-for="s in group.sections" :key="s.heading" :heading="s.heading" :html="s.html" />
          <Backlinks :items="group.backlinks" />
        </div>
      </div>
    </article>

    <template v-else-if="notFound">
      <h1>Entry not found</h1>
      <p>No group with the slug "{{ route.params.slug }}".</p>
    </template>

    <template v-else>
      <h1>Couldn't load this entry</h1>
      <p>Something went wrong. Try reloading the page.</p>
    </template>
  </main>
</template>

<style scoped>
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1rem;
}

header h1 {
  margin-bottom: 0.25rem;
}

header p {
  margin: 0;
}

.title {
  font-style: italic;
  color: var(--accent);
  font-size: 1.2rem;
}

.caption {
  color: var(--muted);
}

.layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Same layout as the character page: infobox on the right when there is one. */
@media (min-width: 768px) {
  .layout:has(.infobox) {
    grid-template-columns: 1fr 18rem;
    grid-template-areas: 'sections infobox';
    align-items: start;
  }

  .layout:has(.infobox) .infobox {
    grid-area: infobox;
  }

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

.members h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

.members ul {
  padding-left: 1.25rem;
}

.member-title {
  margin-left: 0.5rem;
  font-style: italic;
  color: var(--muted);
}
</style>
