export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const { label } = await readBody<{ label: string }>(event)
  if (!label?.trim()) throw createError({ statusCode: 400, statusMessage: 'Label is required' })

  const db = getPrisma()
  return db.tag.update({
    where: { id, user_id: user.id },
    data: { label: label.trim() }
  })
})
