import { createReadStream } from 'node:fs'

// GET /api/media/<slug>/<kind>: a character's bust or full image. The filename comes from the
// entry's frontmatter, never the URL. Anything not served (missing, hidden, retired, invalid,
// bad name, missing file) gets the same 404, so nothing hidden is revealed.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const kind = getRouterParam(event, 'kind') ?? ''

  const media = await getMediaFile(slug, kind)
  if (!media) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeader(event, 'Content-Type', media.contentType)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300')
  return sendStream(event, createReadStream(media.path))
})
