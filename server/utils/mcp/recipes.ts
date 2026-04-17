import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod/v3'
import { toJson } from './helpers'

export function registerRecipeTools(server: McpServer, db: PrismaClient) {
  server.registerTool(
    'list_recipes',
    {
      description: 'List all recipes with optional tag filter. Returns id, title, tags, and hasContent flag (true if recipe has markdown content). Use get_recipe to read the full content.',
      inputSchema: z.object({
        tag: z.string().optional().describe('Filter by exact tag label.')
      })
    },
    async ({ tag }) => {
      const recipes = await db.recipe.findMany({
        where: tag ? { tags: { some: { tag: { label: tag } } } } : {},
        include: { tags: { include: { tag: true } } },
        orderBy: { updated_at: 'desc' }
      })
      return toJson(recipes.map(r => ({
        id: r.id,
        title: r.title,
        tags: r.tags.map(rt => rt.tag.label),
        hasContent: r.content.length > 0
      })))
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
        where: { id },
        include: { tags: { include: { tag: true } } }
      })
      if (!recipe) return toJson({ error: 'Recipe not found' })
      return toJson({
        id: recipe.id,
        title: recipe.title,
        content: recipe.content,
        tags: recipe.tags.map(rt => rt.tag.label),
        updated_at: recipe.updated_at
      })
    }
  )

  server.registerTool(
    'create_recipe',
    {
      description: 'Create a new recipe. Required: title. Optional: content (markdown body), tags (list of existing tag IDs to attach).',
      inputSchema: z.object({
        title: z.string().describe('(required) Recipe title.'),
        content: z.string().optional().describe('Recipe body in markdown format.'),
        tagIds: z.array(z.number().int()).optional().describe('List of tag IDs to attach.')
      })
    },
    async ({ title, content, tagIds }) => {
      const recipe = await db.recipe.create({
        data: {
          user_id: 'mcp',
          title,
          content: content ?? '',
          tags: tagIds?.length ? { create: tagIds.map(tag_id => ({ tag_id })) } : undefined
        },
        include: { tags: { include: { tag: true } } }
      })
      return toJson({
        id: recipe.id,
        title: recipe.title,
        tags: recipe.tags.map(rt => rt.tag.label),
        updated_at: recipe.updated_at
      })
    }
  )

  server.registerTool(
    'update_recipe',
    {
      description: 'Update a recipe by id. All fields optional — only provided fields are changed. Use this to fix formatting, update content, or rename recipes.',
      inputSchema: z.object({
        id: z.number().int().describe('(required) Recipe ID to update.'),
        title: z.string().optional().describe('New title.'),
        content: z.string().optional().describe('New markdown content.')
      })
    },
    async ({ id, title, content }) => {
      const existing = await db.recipe.findFirst({ where: { id } })
      if (!existing) return toJson({ error: 'Recipe not found' })

      const recipe = await db.recipe.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(content !== undefined ? { content } : {})
        },
        include: { tags: { include: { tag: true } } }
      })
      return toJson({
        id: recipe.id,
        title: recipe.title,
        tags: recipe.tags.map(rt => rt.tag.label),
        updated_at: recipe.updated_at
      })
    }
  )
}
