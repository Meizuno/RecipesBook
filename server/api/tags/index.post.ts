export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { label } = await readBody<{ label: string }>(event)
  if (!label?.trim()) throw createError({ statusCode: 400, statusMessage: 'Label is required' })

  const db = getPrisma()
  const count = await db.tag.count({ where: { user_id: user.id } })

  return db.tag.create({
    data: { user_id: user.id, label: label.trim(), color: nextColor(count), position: count }
  })
})
