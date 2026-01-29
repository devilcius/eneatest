import { errorJson, json, parseJsonBody } from '../../../_utils/response'

export async function onRequest(context) {
  const { env, params, request } = context
  const itemId = Number(params.id)

  if (!Number.isFinite(itemId)) {
    return errorJson(400, 'Invalid item id')
  }

  if (request.method !== 'PUT') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await parseJsonBody(request)
  if (!body) return errorJson(400, 'Invalid JSON body')

  const text = body.text != null ? String(body.text).trim() : null
  const isActive = body.isActive != null ? (body.isActive ? 1 : 0) : null
  const updatedAt = new Date().toISOString()

  await env.DB.prepare(
    `
    UPDATE item
    SET text = COALESCE(?2, text),
        is_active = COALESCE(?3, is_active),
        updated_at = ?4
    WHERE id = ?1
    `
  )
    .bind(itemId, text, isActive, updatedAt)
    .run()

  const row = await env.DB.prepare(
    `
    SELECT id, questionnaire_id as questionnaireId, order_index as orderIndex, text, is_active as isActive
    FROM item
    WHERE id = ?1
    `
  )
    .bind(itemId)
    .first()

  if (!row) return errorJson(404, 'Item not found')

  return json({
    ...row,
    isActive: row.isActive === 1,
  })
}
