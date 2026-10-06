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
// Dark mode. The server can't know the visitor's theme, so isDark starts false and is
// corrected on mount. The saved choice is applied earlier by a head script in nuxt.config.ts.
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('theme', theme)
  } catch {}
}

onMounted(() => {
  const saved = document.documentElement.dataset.theme
  isDark.value = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
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
    <NuxtLink to="/" class="brand">Worldbuilding Wiki</NuxtLink>
    <button
      class="theme-toggle"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    >
      {{ isDark ? '☀' : '☾' }}
    </button>
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
/* Sticks to the top while scrolling; the double rule underneath gives it a bookish edge. */
nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.85rem 1.5rem;
  background: var(--surface);
  border-bottom: 3px double var(--border);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.06);
}

.brand {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 0.04em;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}

.brand::before {
  content: '✦';
  margin-right: 0.5rem;
  color: var(--accent);
  font-size: 0.9em;
}

.brand:hover {
  color: var(--accent);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

#nav-menu {
  display: flex;
  gap: 1.25rem;
}

.section {
  position: relative;
  display: flex;
  align-items: center;
}

/* Section links: small caps-style headings with an underline that grows on hover.
   NuxtLink adds .router-link-active when you're on that section or one of its pages. */
.section > a {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  text-decoration: none;
  padding: 0.2rem 0;
  background: linear-gradient(var(--accent), var(--accent)) 0 100% / 0 1px no-repeat;
  transition: background-size 0.2s, color 0.2s;
}

.section > a:hover,
.section > a.router-link-active {
  color: var(--accent);
  background-size: 100% 1px;
}

/* The ▾ turns upside down while its dropdown is open. */
.arrow {
  background: none;
  border: none;
  padding: 0 0.3rem;
  font: inherit;
  font-size: 0.9rem;
  color: var(--muted);
  cursor: pointer;
  transition: transform 0.2s, color 0.2s;
}

.arrow:hover {
  color: var(--accent);
}

.arrow[aria-expanded='true'] {
  transform: rotate(180deg);
  color: var(--accent);
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.6rem);
  left: -0.5rem;
  z-index: 10;
  min-width: 11rem;
  padding: 0.4rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 2px solid var(--accent);
  border-radius: var(--radius);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.15);
}

.dropdown a {
  display: block;
  padding: 0.3rem 0.6rem;
  border-radius: calc(var(--radius) - 2px);
  color: var(--ink);
  text-decoration: none;
}

.dropdown a:hover,
.dropdown a.router-link-active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.hamburger,
.theme-toggle {
  padding: 0.25rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.hamburger:hover,
.theme-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.hamburger {
  display: none;
}

/* Last on wide screens (after the links); beside the hamburger on narrow ones. */
.theme-toggle {
  order: 1;
  margin-left: auto;
}

@media (max-width: 640px) {
  nav {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .brand {
    font-size: 1.1rem;
  }

  .theme-toggle {
    order: 0;
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
    gap: 0.6rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .section {
    flex-wrap: wrap;
  }

  .dropdown {
    position: static;
    width: 100%;
    border: none;
    border-left: 2px solid var(--accent);
    border-radius: 0;
    box-shadow: none;
    padding: 0.25rem 0 0.25rem 0.75rem;
    margin-top: 0.3rem;
  }
}
</style>
