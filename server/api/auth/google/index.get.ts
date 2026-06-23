import { sendRedirect, getHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const host = getHeader(event, 'host') ?? 'localhost:3000'
  // Trust the reverse proxy's protocol when present; otherwise infer from
  // the host: anything resolvable to localhost is http, real hostnames
  // are https. This avoids the `https://localhost` trap that NODE_ENV
  // alone produces when running `pnpm preview` locally.
  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  const isLoopback = /^(localhost|127\.|0\.0\.0\.0|::1|\[::1\])(:|$)/.test(host)
  const proto = forwardedProto ?? (isLoopback ? 'http' : 'https')
  const callbackUrl = encodeURIComponent(`${proto}://${host}/api/auth/callback`)
  // The browser runs the OAuth flow on the auth server's PUBLIC origin (it owns
  // its /google/callback + Google redirect_uri). Server-to-server calls
  // (validate/refresh/me) keep using the internal authServiceUrl. Falls back to
  // authServiceUrl when no separate public URL is configured (dev).
  const authBase = config.authPublicUrl || config.authServiceUrl
  return sendRedirect(event, `${authBase}/google?redirect_url=${callbackUrl}`)
})
