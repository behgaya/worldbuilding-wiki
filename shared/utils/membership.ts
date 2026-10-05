// The one rule for "which group does a character belong to" on public pages: their first
// current membership, in file order. The server has already removed memberships to hidden or
// missing groups, so this is always a public group (or undefined = Unaffiliated).
export function primaryGroup(memberships: readonly { group: string; status: string }[]): string | undefined {
  return memberships.find((m) => m.status === 'current')?.group
}
