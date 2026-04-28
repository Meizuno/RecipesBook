import { randomBytes } from 'node:crypto'

// Process-local secret used by the cache warmer to authenticate its
// loopback requests. Generated lazily on first read; never written to
// disk or environment, so an attacker outside the process can't forge
// it. Both `auth.ts` and `plugins/warm-cache.ts` call this getter and
// compare. Same process → same value.

let token: string | null = null

export function getWarmCacheToken(): string {
  if (!token) token = randomBytes(32).toString('hex')
  return token
}

// Single env var to disable warming (defaults to enabled).
//   WARM_CACHE=off | 0 | false → skip warming on this boot
//   anything else (or unset)   → run warming
export function isWarmCacheEnabled(): boolean {
  const flag = process.env.WARM_CACHE?.toLowerCase()
  return flag !== 'off' && flag !== '0' && flag !== 'false'
}
