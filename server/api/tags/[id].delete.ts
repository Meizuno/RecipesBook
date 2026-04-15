export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = getPrisma()
  await db.tag.delete({ where: { id, user_id: user.id } })
  return { deleted: id }
})
