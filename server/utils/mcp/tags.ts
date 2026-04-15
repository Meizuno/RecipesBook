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

  server.registerTool(
    'add_tag',
    {
      description: `Create a new recipe tag. Required: label. Color is assigned automatically.
⚠️ WARNING: This action modifies user data. You MUST explicitly confirm with the user before calling this tool.`,
      inputSchema: z.object({
        label: z.string().describe('(required) Tag name, e.g. dinner, vegetarian, quick.')
      })
    },
    async ({ label }) => {
      const count = await db.tag.count({ where: { user_id: userId } })
      const tag = await db.tag.create({
        data: { user_id: userId, label, color: nextColor(count), position: count }
      })
      return toJson(tag)
    }
  )

  server.registerTool(
    'remove_tag',
    {
      description: `Delete a recipe tag by id.
⚠️ WARNING: This action permanently deletes user data. You MUST explicitly confirm with the user before calling this tool.`,
      inputSchema: z.object({
        id: z.number().int().describe('(required) Tag ID to delete.')
      })
    },
    async ({ id }) => {
      await db.tag.delete({ where: { id, user_id: userId } })
      return toJson({ deleted: id })
    }
  )
}
