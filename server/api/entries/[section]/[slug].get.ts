export default defineEventHandler(async (event) => {
  const section = getRouterParam(event, 'section') ?? ''
  const slug = getRouterParam(event, 'slug') ?? ''

  const entry = await getEntry(section, slug)

  // Fail closed: only public entries leave the server for now. Hidden entries get the
  // same 404 as missing ones, so their existence isn't revealed.
  if (!entry || entry.visibility !== 'public') {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  return entry
})
