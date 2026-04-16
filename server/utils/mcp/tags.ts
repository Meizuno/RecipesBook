import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod/v3'
import { toJson } from './helpers'

export function registerTagTools(server: McpServer, db: PrismaClient, userId: string) {
  server.registerTool(
    'list_tags',
    {
      description: 'List all recipe tags for the current user. Returns id, label, and color for each tag.',
      inputSchema: z.object({})
    },
    async () => {
      const tags = await db.tag.findMany({
        where: { user_id: userId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }]
      })
      return toJson(tags)
    }
  )
}
