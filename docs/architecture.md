# Architecture

How entries get from a file to a page. The world itself is described in `reference.md`.

## Data flow

```
seed/<section>/<slug>.md         one Markdown file per entry (YAML frontmatter + ## sections)
        │
server/utils/entries.ts          the only code that reads seed files
  getEntry · listEntries · check functions
        │
server/api/entries/[section]/
  [slug].get.ts   index.get.ts   JSON for one entry / a list of summaries
                                 (characters, groups, places; ?type= picks one)
        │
app/pages/...                    useFetch the JSON and display it
```

Pages never read seed files. Swapping the files for a database means changing `entries.ts` only.

## Entry files

- Only files named `<slug>.md` (lowercase letters, digits, dashes) count as entries. Anything else in a section folder, such as `zayn.pt.md`, is ignored.
- Frontmatter is validated on load. An invalid file is not served, and a warning gives the reason.
- Numbers and number-like values must be quoted, for example an Age: `value: "19"`. Unquoted, YAML reads them as numbers and the file is rejected.
- The body is split into sections on top-level `## ` headings. `###` stays inside its section, and text before the first `##` is the intro.

## Visibility (fail closed)

Only the exact value `public` is ever sent to the browser. Anything else counts as hidden: `scholars`, `author`, a typo, or a missing value. This applies at three levels:

- **Entry:** `visibility:` in the frontmatter. A hidden entry gives the same 404 as a missing one.
- **Infobox row:** `{ label: Birth name, value: Samuel, visibility: author }`.
- **Section:** `## Heading {visibility=author}`. The `{…}` is removed from the heading. An unknown or malformed attribute hides the section.

Filtering happens in `entries.ts`, never in a page.

The rule covers every public output: lists, links, member lists, backlinks and error messages. The name, count or existence of a hidden entry, section or row must never appear anywhere public.

## Links between entries

In section text, the intro and infobox values:

| You write | Result |
| --- | --- |
| `[[susie]]` | a link to Susie's page, showing her name |
| `[[emilia\|Emília]]` | the same link, showing your text |

- Slugs match exactly (case-sensitive). Spaces around the slug and text are trimmed.
- In YAML, quote a value that contains a link: `value: "[[susie]]"`. Unquoted, `[[` starts a YAML list and the file is rejected.
- `[[...]]` inside `code` or a code block stays as written. Malformed brackets (`[[ ]]`, `[[ | x]]`, `[[susie`) stay as literal text.

**The link rule:** a link is only made when the target exists, its visibility is exactly `public`, it is not `retired`, and its type has a page. Every other case renders **plain text**, either your custom text or the slug exactly as written. There's no link and no hint in the HTML, and a hidden entry's real name never appears. A slug used in two sections can't be linked until one is renamed.

The URL is built only from the target's section, type and slug, for example `/people/characters/susie`, `/people/groups/team-vulcan` or `/places/trovic`. Every URL comes from one helper, `hrefFor(section, type, slug)`, used by links, backlinks, member lists and breadcrumbs. Types with pages are listed in `TYPE_PATHS` in `entries.ts` (today `character`, `group` and `place`). A type's path segment may be empty (places), so whether a type has a page is always tested with `hasPage(type)`, never with `TYPE_PATHS[type]`.

Rendering is a markdown-it inline rule in `entries.ts`, with raw HTML disabled. The rendered HTML is what the API sends, so pages can show it with `v-html`. `renderMarkdown` also returns the list of links it found, which backlinks use.

## Groups and memberships

A group is its own entry type, `type: group`, for example `seed/people/team-vulcan.md`. Besides the usual fields it has:

| Field | Values |
| --- | --- |
| `kind` | `hunter-team`, `guild`, `cult`, `npc-group` |
| `status` | `registered`, `lupin`, `unregistered`, `disbanded` |
| `order` | optional whole number: order of appearance |

Any other value makes the file invalid. There are no game rules such as team size yet, and no sub-groups (`parent`). Group pages live at `/people/groups` (the list) and `/people/groups/<slug>`.

**Members are derived, never written in the group file.** A character belongs to a group through `memberships` in the character's own file, using the group's **slug**, never its display name:

```yaml
memberships:
  - { group: team-vulcan, status: current }   # current | former | planned
```

- A group's member list shows **public characters with a `current` membership** to it, sorted by name, with name and title.
- `former` and `planned` memberships never leave the server: not in lists, pages or the API.
- A membership to a hidden or missing group is dropped from all public output, so the character shows as "Unaffiliated". It is never shown as plain text either, because that would reveal that the group exists. `npm run check` reports it: a missing group or a non-group target is an error, and a hidden group is a warning.
- **Primary group:** where a character has more than one current membership, they appear **once** in the character list, under their **first** public current membership in file order. Their caption links to the same group (`primaryGroup` in `shared/utils/membership.ts`).

**Order:** group lists are sorted by `order` (ascending), ties by name, and groups without an `order` come last. On the character list, team headings follow that order and "Unaffiliated" is always last.

The list endpoint takes `?type=character`, `?type=group` or `?type=place` (the types in `TYPE_PATHS`). Any other value answers 400.

## Places

A place is an entry of `type: place` in `seed/places/`, for example `seed/places/trovic.md`. Besides the usual fields it has:

| Field | Values |
| --- | --- |
| `kind` | required: `world`, `landmass`, `nation`, `region`, `state` |
| `parent` | optional: the slug of the place it sits in |
| `order` | optional whole number: order among its siblings, as for groups |
| `caption` | optional: for a state, its nickname ("Engine of Zhoter") |

Any other value makes the file invalid. There are no game rules (a state may sit anywhere). Slugs are global, so regions are prefixed by their nation: `zhoter-north`, `zhoter-east` and so on. States and nations use plain slugs (`trovic`, `xobbote`).

**URLs** have no type segment: `/places/zhoter`, `/places/trovic`. `/places` itself is the generic section page, with a list of public nations.

**Children are derived, never written down.** A place's answer has `children`: the public, non-retired places whose `parent` is this place, sorted by `order` (same rule as groups). It goes **two levels deep and no further**: Zhoter returns its regions, each with its states. A region returns its states, each with an empty list. Each child is `{ slug, name, caption, kind, href, children? }`. A place under a hidden parent is unreachable: a state under a hidden region appears in no list, and nothing about it leaks.

**Breadcrumb:** `breadcrumb` lists the ancestors, nearest first (the page shows them top-down: Zhoter › North). The walk goes up through `parent` and includes an ancestor only if it is a public, non-retired place. It **stops at the first ancestor that isn't** (hidden, retired, missing or not a place), and nothing above that point is shown. It is cycle-safe: a visited set and a cap of 8 steps mean it can never loop. It never includes the entry itself. The `parent` field itself is never sent to the browser.

## Backlinks

Every entry answer has `backlinks: [{ section, type, slug, name, href }]`, shown as "Pages that link here" at the bottom of character and group pages, and hidden when empty.

They come **only from `[[links]]`** in text and infobox values; memberships don't count. A source page is listed only when **all** of these hold, otherwise it is left out with no trace (no name, no count):

- the source is public, not retired, and its type has a page;
- the link sits in the intro, a **public** section or a **public** infobox row (a link in an author-only section or row doesn't count);
- the link actually resolves to this entry (so the target is public, not retired, and its type has a page);
- the source isn't the entry itself.

There is one backlink per source, however many times it links. They are sorted by section, then name.

## Commands

- `npm run check` lists every `[[link]]` and every membership whose target is missing (error), not a group (memberships, error) or not public (warning). For places it checks `parent`: missing → error, not a place → error, not public → warning, and a cycle (A → B → A, or a place that is its own parent) → error. It covers every entry, hidden sections and rows included, and prints the file, section or infobox row, and slug. It exits with code 1 on any error, and invalid files are errors too. It needs Node 22.18+ or 23.6+, which can run `.ts` files directly.
- `npm test` runs the Vitest tests in `tests/`.
