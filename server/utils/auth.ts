import { getCookie, getHeader, setCookie, deleteCookie, createError } from 'h3'
import type { H3Event } from 'h3'

export type AuthUser = {
  id: string
  email?: string | null
  name?: string | null
  picture?: string | null
}

// The auth service issues these cookies on COOKIE_DOMAIN (e.g. .meizuno.com),
// so one sign-in is valid across every *.meizuno.com app. We read the SAME
// names it sets, and only re-set them (with the same attributes) when we
// rotate the pair on refresh. access_token is readable (SPAs may Bearer it),
// refresh_token is httpOnly — mirroring the auth service exactly.
const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'
const ACCESS_MAX_AGE = 60 * 15
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

const isSecure = () => process.env.NODE_ENV === 'production'

// Parent domain the cookies are scoped to (NUXT_COOKIE_DOMAIN, e.g.
// `.meizuno.com`). Empty in dev → host-only cookies on localhost.
function cookieDomain(): string | undefined {
  return (useRuntimeConfig().cookieDomain as string) || undefined
}

/** Validate a token string against the auth service */
async function validateToken(token: string): Promise<string | null> {
  if (!token) return null
  try {
    const config = useRuntimeConfig()
    const result = await $fetch<{ user_id: string }>(`${config.authServiceUrl}/validate`, {
      headers: { authorization: `Bearer ${token}` }
    })
    return result.user_id ?? null
  }
  catch {
    return null
  }
}

/** Read cookie from H3 event or raw header (SSR internal fetch) */
function readCookie(event: H3Event, name: string): string | null {
  const fromH3 = getCookie(event, name)
  if (fromH3) return fromH3
  const raw = getHeader(event, 'cookie') ?? ''
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] ?? null
}

// Stores refreshed token per SSR render so internal API calls can use it
let ssrRefreshedToken: string | null = null

/**
 * Authenticate the request. Checks access token first, then tries refresh.
 * Sets event.context.user and event.context.accessToken on success.
 */
export async function authenticate(event: H3Event): Promise<AuthUser | null> {
  // Already authenticated (e.g. by a previous middleware run)
  if (event.context.user) return event.context.user as AuthUser

  // 1. Check Bearer header (MCP clients), then SSR-refreshed token,
  //    then the cookie. `ssrRefreshedToken` must take priority over
  //    the cookie: when an outer page-level middleware refreshes
  //    during the same render, it sets new cookies on the response
  //    but the inner SSR fetch still sees the *original* (stale)
  //    cookie in its forwarded headers. Preferring the cookie there
  //    would short-circuit the `??` chain on a value that's already
  //    expired (and whose refresh-pair has been burned), producing a
  //    spurious 401 on inner /api/auth/me-style calls.
  const header = getHeader(event, 'authorization')
  const accessToken = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (ssrRefreshedToken ?? readCookie(event, ACCESS_COOKIE) ?? '')

  const userId = await validateToken(accessToken)
  if (userId) {
    const user: AuthUser = { id: userId }
    event.context.user = user
    event.context.accessToken = accessToken
    return user
  }

  // 2. Try refresh token
  const refreshToken = readCookie(event, REFRESH_COOKIE)
  if (!refreshToken) return null

  try {
    const config = useRuntimeConfig()
    const result = await $fetch<{ access_token: string, refresh_token: string }>(
      `${config.authServiceUrl}/refresh`,
      { method: 'POST', body: { refresh_token: refreshToken } }
    )

    setAuthCookies(event, result.access_token, result.refresh_token)
    // Store for other SSR internal fetches in the same render
    ssrRefreshedToken = result.access_token
    setTimeout(() => { ssrRefreshedToken = null }, 5_000)

    const newUserId = await validateToken(result.access_token)
    if (!newUserId) return null

    const user: AuthUser = { id: newUserId }
    event.context.user = user
    event.context.accessToken = result.access_token
    return user
  }
  catch {
    return null
  }
}

/** Require authenticated user or throw 401 */
export function requireAuthUser(event: H3Event): AuthUser {
  const user = event.context.user as AuthUser | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}

// Re-set the shared cookies after a rotation. Attributes mirror the auth
// service so whichever side last writes them, the cookie stays identical.
export function setAuthCookies(event: H3Event, accessToken: string, refreshToken: string) {
  const secure = isSecure()
  const domain = cookieDomain()
  setCookie(event, ACCESS_COOKIE, accessToken, {
    httpOnly: false, sameSite: 'lax', secure, path: '/', domain, maxAge: ACCESS_MAX_AGE
  })
  setCookie(event, REFRESH_COOKIE, refreshToken, {
    httpOnly: true, sameSite: 'lax', secure, path: '/', domain, maxAge: REFRESH_MAX_AGE
  })
}

export function clearAuthCookies(event: H3Event) {
  const domain = cookieDomain()
  deleteCookie(event, ACCESS_COOKIE, { path: '/', domain })
  deleteCookie(event, REFRESH_COOKIE, { path: '/', domain })
}
