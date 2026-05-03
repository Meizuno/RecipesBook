export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = getPrisma()
  await db.tag.delete({ where: { id } })
  return { deleted: id }
})
