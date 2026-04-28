import { promises as fsp } from 'node:fs'

// Wipes `.cache/pages/` on any successful recipe or tag mutation. The
// home page is the only thing left that's cached on disk; recipe pages
// stream fresh from `/api/recipes/<id>/stream` every time, so they
// don't need invalidation.
//
// Wipe is coarse (whole dir): the cache is per-user keyed, but a
// recipe edit affects every user's view of the recipe list. Edit
// traffic is rare enough that `rm -rf` is cheaper than tracking which
// users hold which cache files.

const PAGE_DIR = '.cache/pages'

export default defineEventHandler((event) => {
  const method = event.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const path = event.path ?? ''
  const userId = (event.context.user as { id: string } | undefined)?.id
  if (!userId) return  // unauth requests don't trigger invalidation

  if (!path.startsWith('/api/recipes') && !path.startsWith('/api/tags')) return

  event.node.res.on('finish', async () => {
    if (event.node.res.statusCode >= 400) return
    try {
      await fsp.rm(PAGE_DIR, { recursive: true, force: true })
    }
    catch { /* missing is fine */ }
  })
})
