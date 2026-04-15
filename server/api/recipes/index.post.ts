export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { title, content, tagIds } = await readBody<{ title: string, content?: string, tagIds?: number[] }>(event)
  if (!title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Title is required' })

  const db = getPrisma()
  return db.recipe.create({
    data: {
      user_id: user.id,
      title: title.trim(),
      content: content ?? '',
      tags: tagIds?.length ? { create: tagIds.map(tag_id => ({ tag_id })) } : undefined
    },
    include: { tags: { include: { tag: true } } }
  })
})
