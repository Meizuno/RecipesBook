export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const db = getPrisma()
  return db.tag.findMany({
    where: { user_id: user.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  })
})
