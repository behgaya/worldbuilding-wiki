# Worldbuilding Wiki

A personal wiki for my fantasy world: places, powers, people, creatures, objects and lore, in one place and easy to browse. It is built with [Nuxt](https://nuxt.com) and is also a project for learning Nuxt, Postgres and Docker.

**Status:** early development. The site has file-based routing and a home page; layout, navigation and the data layer are being added step by step.

## What the wiki holds

The wiki has six sections:

| Section | Holds |
| --- | --- |
| Places | World map, nations, regions, states |
| Powers | The Order, Chaos and Void systems, with their techniques and contracts |
| People | Characters and groups |
| Bestiary | Incomplete Beings, Anomalies, Primordials and other creatures |
| Objects | Crystals, cursed objects, potions, equipment |
| Lore | History, institutions, concepts, events and legends |

Every entry has a name, a slug, a canon status (canon, legend or retired), a visibility setting, short fields, long text sections and links to other entries.

## Tech stack

- Nuxt (Vue) with npm
- Planned: Postgres in Docker, with Drizzle as the ORM

For now, content comes from seed files in the repository. The database comes after the first pages work.

## Getting started

Requirements: Node.js (current LTS) and Git.

```bash
git clone https://github.com/behgaya/worldbuilding-wiki.git
cd worldbuilding-wiki
npm install
npm run dev
```

Then open <http://localhost:3000>.

If the project folder has a `.env.example`, copy it to `.env` and fill in the values. The real `.env` is never committed.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server with hot reload |
| `npm run build` | Builds the app for production |
| `npm run preview` | Previews the production build locally |

## Project structure

```
app/
  app.vue          Root component (layout and page outlet)
  pages/           Routes, one file per page
  layouts/         Shared page layouts
  components/      Reusable components, such as the navigation bar
  data/            Section configuration and seed data
  assets/css/      Global styles
docs/
  reference.md     Full design reference for the world and the wiki
archive/           Old notes, kept as retired material
CLAUDE.md          Project brief for Claude Code
```

Some of these folders appear as the project grows.

## Roadmap

1. Routing, home page and a dynamic entry page
2. Layout and navigation bar, with a dropdown per section
3. A seed file for the first entry and a function to read it
4. List pages and the full character page
5. Postgres and Drizzle behind the same functions
6. Create, edit and delete forms
7. Visibility, canon status, derived values and rule checks

Not planned yet: clickable map, images, accounts, hosting.

## Notes

- The wiki is for personal use, and the world and its lore are the author's own.
- Author-only content must never be sent to the browser. Visibility is checked on the server.
- Back up the database before risky changes. `docker compose down -v` deletes the data volume.