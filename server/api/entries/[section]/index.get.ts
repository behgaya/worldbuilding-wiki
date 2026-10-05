export default defineEventHandler(async (event) => {
  const section = getRouterParam(event, 'section') ?? ''
  const { type } = getQuery(event)

  // Only known types, so a typo like ?type=grup is an error instead of an empty list.
  if (type !== undefined && !isKnownType(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown type' })
  }

  return listEntries(section, type)
})
