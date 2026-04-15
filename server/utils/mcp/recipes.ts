import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod/v3'
import { toJson } from './helpers'

export function registerRecipeTools(server: McpServer, db: PrismaClient, userId: string) {
  server.registerTool(
    'list_recipes',
    {
      description: 'List recipes. Optional filters: search (matches title or content), tag (exact tag label). Returns id, title, and tags for each recipe. Use get_recipe for full markdown content.',
      inputSchema: z.object({
        search: z.string().optional().describe('Search term to match in title or content.'),
        tag: z.string().optional().describe('Exact tag label to filter by.')
      })
    },
    async ({ search, tag }) => {
      const recipes = await db.recipe.findMany({
        where: {
          user_id: userId,
          ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }] } : {}),
          ...(tag ? { tags: { some: { tag: { label: tag } } } } : {})
        },
        include: { tags: { include: { tag: true } } },
        orderBy: { updated_at: 'desc' }
      })
      return toJson(recipes.map(r => ({ id: r.id, title: r.title, tags: r.tags.map(rt => rt.tag.label) })))
    }
  )

  server.registerTool(
    'get_recipe',
    {
      description: 'Get full recipe by id. Returns title, content (markdown), tags, and timestamps.',
      inputSchema: z.object({
        id: z.number().int().describe('(required) Recipe ID.')
      })
    },
    async ({ id }) => {
      const recipe = await db.recipe.findFirst({
        where: { id, user_id: userId },
        include: { tags: { include: { tag: true } } }
      })
      if (!recipe) return toJson({ error: 'Recipe not found' })
      return toJson({ id: recipe.id, title: recipe.title, content: recipe.content, tags: recipe.tags.map(rt => rt.tag.label), updated_at: recipe.updated_at })
    }
  )

  server.registerTool(
    'add_recipe',
    {
      description: `Create a new recipe. Required: title. Optional: content (markdown body), tags (list of tag labels — existing tags are linked, new labels are created automatically).
⚠️ WARNING: This action modifies user data. You MUST explicitly confirm with the user before calling this tool.`,
      inputSchema: z.object({
        title: z.string().describe('(required) Recipe title.'),
        content: z.string().optional().describe('Recipe body in markdown format.'),
        tags: z.array(z.string()).optional().describe('List of tag labels to attach.')
      })
    },
    async ({ title, content, tags }) => {
      const tagConnections = []
      if (tags?.length) {
        for (const label of tags) {
          let tag = await db.tag.findFirst({ where: { user_id: userId, label } })
          if (!tag) {
            const count = await db.tag.count({ where: { user_id: userId } })
            tag = await db.tag.create({ data: { user_id: userId, label, color: nextColor(count), position: count } })
          }
          tagConnections.push({ tag_id: tag.id })
        }
      }
      const recipe = await db.recipe.create({
        data: { user_id: userId, title, content: content ?? '', tags: { create: tagConnections } },
        include: { tags: { include: { tag: true } } }
      })
      return toJson({ id: recipe.id, title: recipe.title, tags: recipe.tags.map(rt => rt.tag.label) })
    }
  )

  server.registerTool(
    'update_recipe',
    {
      description: `Update a recipe by id. All fields optional — only provided fields are changed. For tags, provide the full list of labels (replaces existing).
⚠️ WARNING: This action modifies user data. You MUST explicitly confirm with the user before calling this tool.`,
      inputSchema: z.object({
        id: z.number().int().describe('(required) Recipe ID.'),
        title: z.string().optional().describe('New title.'),
        content: z.string().optional().describe('New markdown content.'),
        tags: z.array(z.string()).optional().describe('Full list of tag labels (replaces existing).')
      })
    },
    async ({ id, title, content, tags }) => {
      const existing = await db.recipe.findFirst({ where: { id, user_id: userId } })
      if (!existing) return toJson({ error: 'Recipe not found' })

      if (tags !== undefined) {
        await db.recipeTag.deleteMany({ where: { recipe_id: id } })
        for (const label of tags) {
          let tag = await db.tag.findFirst({ where: { user_id: userId, label } })
          if (!tag) {
            const count = await db.tag.count({ where: { user_id: userId } })
            tag = await db.tag.create({ data: { user_id: userId, label, color: nextColor(count), position: count } })
          }
          await db.recipeTag.create({ data: { recipe_id: id, tag_id: tag.id } })
        }
      }

      const recipe = await db.recipe.update({
        where: { id },
        data: { ...(title !== undefined ? { title } : {}), ...(content !== undefined ? { content } : {}) },
        include: { tags: { include: { tag: true } } }
      })
      return toJson({ id: recipe.id, title: recipe.title, tags: recipe.tags.map(rt => rt.tag.label) })
    }
  )

  server.registerTool(
    'delete_recipe',
    {
      description: `Delete a recipe by id.
⚠️ WARNING: This action permanently deletes user data. You MUST explicitly confirm with the user before calling this tool.`,
      inputSchema: z.object({
        id: z.number().int().describe('(required) Recipe ID to delete.')
      })
    },
    async ({ id }) => {
      const existing = await db.recipe.findFirst({ where: { id, user_id: userId } })
      if (!existing) return toJson({ error: 'Recipe not found' })
      await db.recipe.delete({ where: { id } })
      return toJson({ deleted: id })
    }
  )
}
