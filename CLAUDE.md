# Worldbuilding Wiki

A personal wiki for my fantasy world, built with Nuxt. I'm learning Nuxt (I know basic Vue), so explain what you do in a sentence or two and keep changes small. Don't commit or push; I do that myself.

## Stack and stage
- Nuxt (Vue), npm. Later: Postgres in Docker with Drizzle.
- Current stage: **no database yet**. Content comes from seed files (JSON or Markdown with frontmatter) in the repo.
- Don't add modules, UI libraries, auth, or a database unless I ask.
- The full design is in `docs/reference.md`. Read the relevant part of it before building a feature. Old notes are in `archive/` (retired material, in Portuguese; not canon unless the reference says so).

## Wiki structure
Six sections: Places, Powers, People, Bestiary, Objects, Lore.
Every entry has: section, type, slug, name, parent, canon status, visibility, development level, aliases, fields, long text sections, and links to other entries. Only the name is required, and "Unknown" is a valid value.

## Rules to follow
- **Data access goes through a few server functions** (for example `getEntry`, `listEntries`, `getBacklinks`). Pages never read seed files or the database directly, so I can swap the storage later.
- **Author-only data must never reach the browser.** Filter by visibility on the server, not in the page.
- **Canon status** is `canon`, `legend` (an in-world belief that isn't true) or `retired` (obsolete). Retired names stay as hidden aliases.
- **Derived values are computed, not stored:** eye color, crystal, region, condition (Hybrid, Abyssal, Etherless), pole side effect.
- Each entry has one parent. An entry sitting between sections has one home page and a redirect from the other section.
- No ranks anywhere (old character cards still show a Rank field; ignore it).

## Terminology (use these exact words)
- Three forces: **Order**, **Chaos**, **Void**. Void is older than both and a threat to them.
- Order: **Aspects** (Balance, Harmony, Cycle, Emotion, Growth), ten elements, **bending**. Transformation is an Ether technique. **Ether Perception** is the trained technique; **Ether Awareness** is the Transcendence ability.
- Chaos: four **Domains** (Dimension, Attraction, Flow, Matter) with eight poles. The Matter pole is called **Substance**. **Primordials**, **Chaos Contract**; the holder is a **host**.
- Void: four **Interferences** (Negation, Mutation, Sensation, Manifestation). **Anomalies**, **Remnants**, **Void Pact**; the holder is a **vessel**, and their condition is **Hybrid**. A failed Hybrid becomes an **Abyssal**.
- Places: four **regions** in Zhoter, ten **states**, no cities. Sek'luz (Light, above) and Mughierel (Darkness, underground) share one footprint.

## Build order
1. Nuxt runs, file-based routing, home page, dynamic page `pages/[section]/[slug].vue`.
2. Hardcoded entry for Zayn (People), then moved to a seed file.
3. Lists and full character page (infobox, sections, relations).
4. Postgres in Docker plus Drizzle behind the same functions.
5. Create, edit, delete forms.
6. Visibility, canon status, derived values, rule checks.

## Not now
Clickable map, images, accounts, hosting, importing old notes, alchemy details, the rule checker, side effects for six Chaos poles.