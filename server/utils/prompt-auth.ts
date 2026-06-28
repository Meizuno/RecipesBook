import { createError } from 'h3'
import type { H3Event } from 'h3'

/**
 * Gate a prompt request. The middleware has already resolved the principal
 * from the Bearer token (ai-chat) or the session cookie (browser), so we
 * simply require a real authenticated user — never a caller-asserted identity.
 */
export function verifyPromptAccess(event: H3Event): void {
  const user = event.context.user as { id: string } | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}
