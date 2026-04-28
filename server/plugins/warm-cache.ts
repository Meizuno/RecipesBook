import { getPrisma } from '../utils/db'
import { getWarmCacheToken, isWarmCacheEnabled } from '../utils/warm-cache'

// Background cache warmer.
//
// On Nitro startup, polls /api/health until the HTTP server answers,
// then fetches every RecipeView island fragment via the loopback. Each
// request carries a process-local secret header that `auth.ts`
// recognizes, so warming bypasses the auth-service round-trip and acts
// as the recipe owner. Responses flow through `plugins/island-cache.ts`
// (`beforeResponse` hook), which writes the rendered JSON to disk;
// subsequent visitors get cache hits.
//
// Configuration: one env var to disable, otherwise auto.
//   WARM_CACHE=off | 0 | false  → skip warming on this boot
//   anything else (or unset)    → run warming
//
// Skipped in `nuxt dev`: dev's HTTP loopback shape differs and HMR
// invalidates the cache anyway, so warming would just churn.

const READINESS_TIMEOUT_MS = 60_000   // overall budget to wait for /api/health
const READINESS_POLL_MS = 200         // gap between health probes
const BATCH_SIZE = 5                  // concurrent fetches per batch
const PER_REQUEST_TIMEOUT_MS = 30_000

export default defineNitroPlugin(() => {
  if (import.meta.dev) return
  if (!isWarmCacheEnabled()) {
    console.log('[warm-cache] disabled (WARM_CACHE=off)')
    return
  }

  // Fire-and-forget. Don't block startup; let the server start
  // listening first, then warm in the background.
  void runWarming().catch((err) => {
    console.error('[warm-cache] error:', err)
  })
})

async function runWarming() {
  const port = process.env.PORT ?? process.env.NITRO_PORT ?? '3000'
  const base = `http://127.0.0.1:${port}`

  await waitForHealth(base)

  const db = getPrisma()

  // Auto-detect the user to warm for: pick the first non-deleted
  // recipe's owner. For a single-user app, this is the user.
  const anyRecipe = await db.recipe.findFirst({
    where: { is_deleted: false },
    select: { user_id: true }
  })
  const userId = anyRecipe?.user_id

  const recipes = userId
    ? await db.recipe.findMany({
      where: { user_id: userId, is_deleted: false },
      select: { id: true }
    })
    : []

  // `v: 0` matches the version ref's initial value in the recipe page.
  const urls: string[] = recipes.map(r => `/__nuxt_island/RecipeView.json?props=${
    encodeURIComponent(JSON.stringify({ id: r.id, v: 0 }))
  }`)

  const total = urls.length
  console.log(`[warm-cache] starting — ${total} URLs to warm`)
  const startedAt = Date.now()

  if (!userId || urls.length === 0) {
    console.log('[warm-cache] no recipes in DB; nothing to warm')
    return
  }

  // Auth-bypass headers: prove this request originated from inside the
  // process and supply the user identity to act as. `auth.ts` checks
  // these and sets event.context.user; the island-cache plugin's write
  // hook then has a user to gate on.
  const warmHeaders = {
    'x-warm-cache': getWarmCacheToken(),
    'x-warm-cache-user': userId
  }

  let ok = 0
  let failed = 0

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(u => $fetch(`${base}${u}`, {
        headers: warmHeaders,
        timeout: PER_REQUEST_TIMEOUT_MS
      }))
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok++
      else {
        failed++
        if (failed <= 3) {
          console.warn('[warm-cache] failed:', (r.reason as Error | undefined)?.message)
        }
      }
    }
    const done = i + batch.length
    if (done < total) console.log(`[warm-cache] ${done}/${total} (${ok} ok, ${failed} failed)`)
  }

  const elapsedMs = Date.now() - startedAt
  console.log(`[warm-cache] done — ${ok} cached, ${failed} failed, ${elapsedMs}ms`)
}

async function waitForHealth(base: string) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      await $fetch(`${base}/api/health`, { timeout: 1000 })
      return
    }
    catch {
      await new Promise(resolve => setTimeout(resolve, READINESS_POLL_MS))
    }
  }
  throw new Error(`server did not respond at /api/health within ${READINESS_TIMEOUT_MS}ms`)
}
