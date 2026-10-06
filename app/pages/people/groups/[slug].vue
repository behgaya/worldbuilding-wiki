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

      <EntryBody :entry="group">
        <!-- Members are derived on the server from characters' current memberships. -->
        <template #after-intro>
          <section v-if="group.members?.length" class="members">
            <h2>Members</h2>
            <ul>
              <li v-for="m in group.members" :key="m.slug">
                <CharacterPortrait class="thumb" :src="m.bust" :alt="m.name" :name="m.name" fallback="none" />
                <NuxtLink :to="m.href">{{ m.name }}</NuxtLink>
                <span v-if="m.title" class="member-title">{{ m.title }}</span>
              </li>
            </ul>
          </section>
        </template>
      </EntryBody>
    </article>

    <EntryMissing v-else :not-found="!!notFound" kind="group" />
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

.members h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

.members ul {
  padding-left: 1.25rem;
}

/* A small round bust before the name (nothing when there's no image). */
.thumb {
  vertical-align: middle;
  margin-right: 0.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  object-fit: cover;
  object-position: top center;
}

.member-title {
  margin-left: 0.5rem;
  font-style: italic;
  color: var(--muted);
}
</style>
