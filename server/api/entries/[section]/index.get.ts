export default defineEventHandler(async (event) => {
  const section = getRouterParam(event, 'section') ?? ''
  return listEntries(section)
})
