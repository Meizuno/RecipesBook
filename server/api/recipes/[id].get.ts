export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))

  const db = getPrisma()
  const recipe = await db.recipe.findFirst({
    where: { id, user_id: user.id },
    include: { tags: { include: { tag: true } } }
  })
  if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
  return recipe
})
