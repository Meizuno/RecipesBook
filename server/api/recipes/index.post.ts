export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { title, content, tagIds, is_favorite } = await readBody<{
    title: string
    content?: string
    tagIds?: number[]
    is_favorite?: boolean
  }>(event)
  if (!title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Title is required' })

  const db = getPrisma()
  return db.recipe.create({
    data: {
      user_id: user.id,
      title: title.trim(),
      content: content ?? '',
      is_favorite: is_favorite ?? false,
      tags: tagIds?.length ? { create: tagIds.map(tag_id => ({ tag_id })) } : undefined
    },
    include: { tags: { include: { tag: true } } }
  })
})
