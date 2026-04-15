export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const tag = query.tag ? String(query.tag) : ''
  const search = query.search ? String(query.search) : ''

  const db = getPrisma()
  return db.recipe.findMany({
    where: {
      user_id: user.id,
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(tag ? { tags: { some: { tag: { label: tag } } } } : {})
    },
    include: { tags: { include: { tag: true } } },
    orderBy: { updated_at: 'desc' }
  })
})
