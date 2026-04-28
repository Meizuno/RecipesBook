import { getPrisma } from './db'

// Shared recipe projection used by `/api/recipes/[id]` (edit form
// load). The streaming view endpoint at `/api/recipes/[id]/stream`
// embeds its own select and emits metadata + content over the wire.

export type RecipeWithTags = {
  id: number
  title: string
  content: string
  updated_at: Date
  tags: { tag_id: number, tag: { id: number, label: string, color: string } }[]
}

export function loadRecipe(id: number): Promise<RecipeWithTags | null> {
  return getPrisma().recipe.findFirst({
    where: { id, is_deleted: false },
    select: {
      id: true,
      title: true,
      content: true,
      updated_at: true,
      tags: {
        select: {
          tag_id: true,
          tag: { select: { id: true, label: true, color: true } }
        }
      }
    }
  })
}
