export interface Subsection {
  name: string
  slug: string
}

export interface Section {
  name: string
  slug: string
  description: string
  subsections: Subsection[]
}

export const sections: Section[] = [
  {
    name: 'Places',
    slug: 'places',
    description: 'TODO: description',
    subsections: [
      { name: 'World map', slug: 'world-map' },
      { name: 'Zhoter', slug: 'zhoter' },
    ],
  },
  {
    name: 'Powers',
    slug: 'powers',
    description: 'TODO: description',
    subsections: [
      { name: 'Order', slug: 'order' },
      { name: 'Chaos', slug: 'chaos' },
      { name: 'Void', slug: 'void' },
    ],
  },
  {
    name: 'People',
    slug: 'people',
    description: 'TODO: description',
    subsections: [
      { name: 'Characters', slug: 'characters' },
      { name: 'Groups', slug: 'groups' },
    ],
  },
  {
    name: 'Bestiary',
    slug: 'bestiary',
    description: 'TODO: description',
    subsections: [
      { name: 'Incomplete Beings', slug: 'incomplete-beings' },
      { name: 'Anomalies', slug: 'anomalies' },
      { name: 'Primordials', slug: 'primordials' },
    ],
  },
  {
    name: 'Objects',
    slug: 'objects',
    description: 'TODO: description',
    subsections: [
      { name: 'Crystals', slug: 'crystals' },
      { name: 'Cursed Objects', slug: 'cursed-objects' },
      { name: 'Potions', slug: 'potions' },
      { name: 'Equipment', slug: 'equipment' },
    ],
  },
  {
    name: 'Lore',
    slug: 'lore',
    description: 'TODO: description',
    subsections: [
      { name: 'History', slug: 'history' },
      { name: 'Institutions', slug: 'institutions' },
      { name: 'Concepts', slug: 'concepts' },
      { name: 'Events', slug: 'events' },
      { name: 'Legends', slug: 'legends' },
    ],
  },
]
