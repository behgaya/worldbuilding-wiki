<script setup lang="ts">
interface InfoRow {
  label: string
  value?: string
}

interface InfoGroup {
  title: string
  rows: InfoRow[]
}

const props = defineProps<{
  title: string
  groups: InfoGroup[]
}>()

// Hide rows with no value, and groups that end up empty.
const visibleGroups = computed(() =>
  props.groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.value?.trim()) }))
    .filter((g) => g.rows.length > 0),
)
</script>

<template>
  <aside v-if="visibleGroups.length" class="infobox" :aria-label="title">
    <p class="infobox-title">{{ title }}</p>
    <div v-for="group in visibleGroups" :key="group.title">
      <h3>{{ group.title }}</h3>
      <dl>
        <template v-for="row in group.rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <!-- HTML rendered on the server: text escaped, [[links]] resolved, raw HTML disabled. -->
          <dd v-html="row.value" />
        </template>
      </dl>
    </div>
  </aside>
</template>

<style scoped>
.infobox {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.infobox-title {
  margin: 0;
  padding: 0.75rem 1rem;
  font-family: var(--font-heading);
  font-size: 1.25rem;
  text-align: center;
}

h3 {
  margin: 0;
  padding: 0.35rem 1rem;
  font-size: 0.95rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
  padding: 0.5rem 1rem 0.75rem;
}

dt {
  color: var(--muted);
}

dd {
  margin: 0;
  color: var(--ink);
}
</style>
