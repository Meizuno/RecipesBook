import { existsSync, promises as fsp } from 'node:fs'
import { dirname } from 'node:path'
import { homeFilePath } from '../middleware/page-cache'

// Write side of the home-page cache. The `beforeResponse` hook is the
// h3-v2-safe way to observe a response body — patching `res.write/end`
// from middleware no longer captures responses sent through Web
// Response paths. See `server/middleware/page-cache.ts` for disk
// layout and key choices.

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return

  nitroApp.hooks.hook('beforeResponse', async (event, response) => {
    if (event.method !== 'GET') return

    const fullPath = event.path ?? ''
    const [path, query = ''] = fullPath.split('?')
    if ((path !== '/' && path !== '') || query) return

    const userId = (event.context.user as { id: string } | undefined)?.id
    if (!userId) return
    if (event.node.res.statusCode !== 200) return

    const filePath = homeFilePath(userId)
    if (existsSync(filePath)) return

    const raw = response.body
    const body = typeof raw === 'string' ? raw : null
    if (!body) return

    try {
      await fsp.mkdir(dirname(filePath), { recursive: true })
      await fsp.writeFile(filePath, body, 'utf-8')
    }
    catch (err) {
      console.error('[page-cache] write failed:', (err as Error).message)
    }
  })
})
