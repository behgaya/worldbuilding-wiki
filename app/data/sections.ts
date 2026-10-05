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
    description: 'The world map and its nations, regions and states, with their cultures, governments and landmarks.',
    subsections: [
      { name: 'World map', slug: 'world-map' },
      { name: 'Zhoter', slug: 'zhoter' },
    ],
  },
  {
    name: 'Powers',
    slug: 'powers',
    description: 'How Order, Chaos and Void work: elements, techniques, contracts and the rules that bind them.',
    subsections: [
      { name: 'Order', slug: 'order' },
      { name: 'Chaos', slug: 'chaos' },
      { name: 'Void', slug: 'void' },
    ],
  },
  {
    name: 'People',
    slug: 'people',
    description: 'The characters of the world and the teams, guilds and organizations they belong to.',
    subsections: [
      { name: 'Characters', slug: 'characters' },
      { name: 'Groups', slug: 'groups' },
    ],
  },
  {
    name: 'Bestiary',
    slug: 'bestiary',
    description: 'Monsters, spirits and other creatures, and how hunters deal with them.',
    subsections: [
      { name: 'Incomplete Beings', slug: 'incomplete-beings' },
      { name: 'Anomalies', slug: 'anomalies' },
      { name: 'Primordials', slug: 'primordials' },
    ],
  },
  {
    name: 'Objects',
    slug: 'objects',
    description: 'Crystals, cursed objects, potions, equipment and the technology of everyday life.',
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
    description: 'History, institutions, concepts and legends: the stories behind the world.',
    subsections: [
      { name: 'History', slug: 'history' },
      { name: 'Institutions', slug: 'institutions' },
      { name: 'Concepts', slug: 'concepts' },
      { name: 'Events', slug: 'events' },
      { name: 'Legends', slug: 'legends' },
    ],
  },
]
