export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = getPrisma()

  const existing = await db.recipe.findFirst({ where: { id, user_id: user.id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })

  await db.recipe.delete({ where: { id } })
  return { deleted: id }
})
