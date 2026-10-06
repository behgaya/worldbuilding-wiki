<script setup>
const route = useRoute()

const zayn = {
  section: 'people',
  slug: 'zayn',
  name: 'Zayn',
  title: 'The Molten Dragon',
  age: 19,
  hometown: 'Xobbote',
  bending: 'Lava',
  sections: [
    {
      heading: 'Overview',
      text: 'Born in the volcanic city of Xobbote, Zayn learned to bend lava before learning to walk, and has a temper as hot as the rivers of fire Zayn commands.'
    }
  ]
}

const entry = computed(() =>
  route.params.section === 'people' && route.params.slug === 'zayn' ? zayn : null
)
</script>

<template>
  <div>
    <p>Section: {{ route.params.section }} · Slug: {{ route.params.slug }}</p>

    <div v-if="entry">
      <h1>{{ entry.name }}</h1>
      <p><em>{{ entry.title }}</em></p>
      <ul>
        <li>Age: {{ entry.age }}</li>
        <li>Hometown: {{ entry.hometown }}</li>
        <li>Bending: {{ entry.bending }}</li>
      </ul>
      <section v-for="s in entry.sections" :key="s.heading">
        <h2>{{ s.heading }}</h2>
        <p>{{ s.text }}</p>
      </section>
    </div>

    <p v-else>Entry not found</p>
  </div>
</template>
