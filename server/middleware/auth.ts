import { getCookie, getHeader } from 'h3'
import { tryRefresh } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = event.path ?? ''
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return

  // Check Bearer token first (MCP clients), then cookie (browser)
  const header = getHeader(event, 'authorization')
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (getCookie(event, 'cb_access') ?? '')

  const user = await verifyAccessToken(token)

  if (user) {
    event.context.user = user
    event.context.accessToken = token
    return
  }

  await tryRefresh(event)
})
