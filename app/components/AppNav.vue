<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { sections } from '~/data/sections'

// Reactive state: which dropdown is open (by slug), and whether the mobile menu is open.
const openSlug = ref<string | null>(null)
const menuOpen = ref(false)

// Template refs: filled in by Vue with the real DOM elements after mount.
const navEl = ref<HTMLElement | null>(null)
const hamburgerEl = ref<HTMLButtonElement | null>(null)

// Arrow buttons are rendered in a v-for, so collect them with a function ref keyed by slug.
const buttonRefs: Record<string, HTMLElement> = {}
function setButtonRef(slug: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) buttonRefs[slug] = el
}

function toggle(slug: string) {
  openSlug.value = openSlug.value === slug ? null : slug
}

function closeAll() {
  openSlug.value = null
  menuOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (navEl.value && !navEl.value.contains(e.target as Node)) closeAll()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (openSlug.value) {
    const slug = openSlug.value
    openSlug.value = null
    buttonRefs[slug]?.focus()
  } else if (menuOpen.value) {
    menuOpen.value = false
    hamburgerEl.value?.focus()
  }
}

// ArrowDown/ArrowUp: open the dropdown from its button, then move between its links.
async function onItemKeydown(e: KeyboardEvent, slug: string) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const item = e.currentTarget as HTMLElement
  const target = e.target as HTMLElement

  if (target === buttonRefs[slug]) {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    openSlug.value = slug
    await nextTick() // wait for v-show to reveal the list before focusing into it
    item.querySelector<HTMLElement>('.dropdown a')?.focus()
    return
  }

  const links = Array.from(item.querySelectorAll<HTMLElement>('.dropdown a'))
  const i = links.indexOf(target)
  if (i === -1) return
  e.preventDefault()
  const next = e.key === 'ArrowDown' ? i + 1 : i - 1
  links[(next + links.length) % links.length]?.focus()
}

// Close a dropdown when keyboard focus moves outside its section (e.g. tabbing past the last link).
// relatedTarget is null for mouse clicks on non-focusable areas; the document click handler covers those.
function onItemFocusout(e: FocusEvent, slug: string) {
  const next = e.relatedTarget as Node | null
  const item = e.currentTarget as HTMLElement
  if (next && !item.contains(next) && openSlug.value === slug) openSlug.value = null
}

// Document listeners only exist in the browser, so attach them after mount and clean up on unmount.
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

// Close everything after navigating.
const route = useRoute()
watch(() => route.path, closeAll)
</script>

<template>
  <nav ref="navEl">
    <NuxtLink to="/">Worldbuilding Wiki</NuxtLink>
    <button
      ref="hamburgerEl"
      class="hamburger"
      :aria-expanded="menuOpen"
      aria-controls="nav-menu"
      @click="menuOpen = !menuOpen"
    >
      ☰ Menu
    </button>
    <ul id="nav-menu" :class="{ open: menuOpen }">
      <li
        v-for="s in sections"
        :key="s.slug"
        class="section"
        @keydown="onItemKeydown($event, s.slug)"
        @focusout="onItemFocusout($event, s.slug)"
      >
        <NuxtLink :to="`/${s.slug}`">{{ s.name }}</NuxtLink>
        <button
          :ref="(el) => setButtonRef(s.slug, el)"
          class="arrow"
          :aria-expanded="openSlug === s.slug"
          :aria-controls="`sub-${s.slug}`"
          :aria-label="`${s.name} subsections`"
          @click="toggle(s.slug)"
        >
          ▾
        </button>
        <ul v-show="openSlug === s.slug" :id="`sub-${s.slug}`" class="dropdown">
          <li v-for="sub in s.subsections" :key="sub.slug">
            <NuxtLink :to="`/${s.slug}/${sub.slug}`">{{ sub.name }}</NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

#nav-menu {
  display: flex;
  gap: 1rem;
}

.section {
  position: relative;
}

.arrow {
  background: none;
  border: none;
  padding: 0 0.25rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 10rem;
  padding: 0.5rem;
  background: Canvas;
  color: CanvasText;
  border: 1px solid;
}

.dropdown li + li {
  margin-top: 0.25rem;
}

.hamburger {
  display: none;
}

@media (max-width: 640px) {
  nav {
    flex-wrap: wrap;
  }

  .hamburger {
    display: block;
  }

  #nav-menu {
    display: none;
    width: 100%;
  }

  #nav-menu.open {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dropdown {
    position: static;
    border: none;
    padding: 0.25rem 0 0 1rem;
  }
}
</style>
