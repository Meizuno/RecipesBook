export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const db = getPrisma()
  return db.tag.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  })
})
