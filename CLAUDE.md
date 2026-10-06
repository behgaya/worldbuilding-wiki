# Worldbuilding Wiki

A personal wiki for my fantasy world, built with Nuxt. I'm learning Nuxt (I know basic Vue), so explain what you do in a sentence or two and keep changes small. Don't commit or push; I do that myself.

## Stack and stage
- Nuxt (Vue), npm. Later: Postgres in Docker with Drizzle.
- Current stage: **no database yet**. Content comes from Markdown files with YAML frontmatter in `seed/<section>/<slug>.md` (slug = filename; the folder sets the section). All reading and validation lives in `server/utils/entries.ts`. Files named `name.xx.md` (for example `zayn.pt.md`) are reserved for future translations and are ignored for now.
- Allowed dependencies: `yaml` and `markdown-it` (server-side only, not Nuxt modules) and `vitest` (dev). Don't add modules, UI libraries, auth, a database or any other dependency unless I ask.
- The full design is in `docs/reference.md`. Read the relevant part of it before building a feature. The data flow is explained in `docs/architecture.md`. Old notes are in `archive/` (retired material, in Portuguese; not canon unless the reference says so).

## Wiki structure
Six sections: Places, Powers, People, Bestiary, Objects, Lore.
Every entry has: section, type, slug, name, parent, canon status, visibility, development level, aliases, fields, long text sections, and links to other entries. Only the name is required, and "Unknown" is a valid value.

## Rules to follow
- **Data access goes through a few server functions** (`getEntry`, `listEntries`, and the backlink and member helpers they call). Pages never read seed files or the database directly, so I can swap the storage later. API answers are built from named fields only, never by spreading a whole object.
- **Images** live in `media/`, never in `public/`, and are served only through `/api/media` after the visibility check.
- **Author-only data must never reach the browser.** Filter by visibility on the server, not in the page. This includes the names, counts and existence of hidden entries, sections and rows: they must not show up in lists, links, backlinks, member lists or error messages. Only the exact string `public` is served; anything else (including a typo) is hidden.
- **Links:** `[[slug]]` or `[[slug|text]]` in section text and infobox values. Quote them in YAML (`value: "[[susie]]"`). A link is made only when the target is exactly `public` (and not retired, and its type has a page); otherwise it renders as plain text (custom text or the slug as written) with no trace of the target or its name. `npm run check` reports missing targets (error) and non-public ones (warning). Details in `docs/architecture.md`.
- **Groups and memberships:** a group is its own entry type (`type: group`). Characters reference a group by its **slug** in `memberships` (`group: team-vulcan`), never by display name. Group member lists are derived from characters' memberships, never written in the group file. Only `current` memberships of public characters are shown publicly; `former` and `planned` never appear in any public output. A character appears once, under their first public current membership in file order. Group lists are sorted by `order`, ties by name, no `order` last; "Unaffiliated" is always last.
- **Places:** `type: place` in `seed/places/`, with `kind` (world, landmass, nation, region, state), an optional `parent` (another place's slug) and `order`. URLs have no type segment (`/places/trovic`). Children (two levels) and the breadcrumb are derived from `parent`, never written down; only public, non-retired places appear in them, and a breadcrumb stops at the first ancestor that isn't. Region slugs are prefixed by their nation (`zhoter-north`) so slugs stay unique. No game rules on nesting.
- **Backlinks** ("Pages that link here") come only from `[[links]]`, never memberships. A source counts only if it is public, not retired, has a page, and the link is in its intro or a public section or infobox row. Hidden sources leave no trace. One per source, no self-links, sorted by section then name. Details in `docs/architecture.md`.
- **Canon status** is `canon`, `legend` (an in-world belief that isn't true) or `retired` (obsolete). Retired names stay as hidden aliases.
- **Derived values are computed, not stored:** eye color, crystal, region, condition (Hybrid, Abyssal, Etherless), pole side effect.
- Each entry has one parent. An entry sitting between sections has one home page and a redirect from the other section.
- No ranks anywhere (old character cards still show a Rank field; ignore it).
- **Never invent lore.** If an entry needs content I haven't given you, leave a minimal stub (name, short intro) and tell me.
- **Checks:** after any change to the reader, the seed format or the links, run `npm test` and `npm run check` and show me the output.

## Terminology (use these exact words)
- Three forces: **Order**, **Chaos**, **Void**. Void is older than both and a threat to them.
- Order: **Aspects** (Balance, Harmony, Cycle, Emotion, Growth), ten elements, **bending**. Transformation is an Ether technique. **Ether Perception** is the trained technique; **Ether Awareness** is the Transcendence ability.
- Chaos: four **Domains** (Dimension, Attraction, Flow, Matter) with eight poles. The Matter pole is called **Substance**. **Primordials**, **Chaos Contract**; the holder is a **host**.
- Void: four **Interferences** (Negation, Mutation, Sensation, Manifestation). **Anomalies**, **Remnants**, **Void Pact**; the holder is a **vessel**, and their condition is **Hybrid**. A failed Hybrid becomes an **Abyssal**.
- Places: four **regions** in Zhoter, ten **states**, no cities. Sek'luz (Light, above) and Mughierel (Darkness, underground) share one footprint.
- Hunters are a government profession: they can kill monsters but not humans. Legal hunter teams are registered (1 to 3 members); illegal ones are **Lupins**.

## Build order
Done: Nuxt and routing, home and section pages, seed files as Markdown, character list and page, infobox, wiki links, group type (Team Vulcan), backlinks.
Now: Places (Zhoter, its regions and states, Xobbote).
Next: Powers (so infobox values become links), then the rest of the cast.
Later: aliases and search, Postgres and Drizzle behind the same functions, create/edit/delete forms, visibility editing, derived values and rule checks, Portuguese translation (`@nuxtjs/i18n` plus `name.pt.md` files).

## Not now
Clickable map, gallery, image uploads, accounts, hosting, importing old notes, alchemy details, the rule checker, side effects for six Chaos poles, translation, typed relations (partner/rival with notes per side).