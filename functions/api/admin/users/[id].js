import { errorJson, json, parseJsonBody } from '../../../_utils/response'

export async function onRequest(context) {
  const { env, params, request } = context
  const userId = Number(params.id)

  if (!Number.isFinite(userId)) {
    return errorJson(400, 'Invalid user id')
  }

  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      `
      SELECT id, external_id as externalId, display_name as displayName, email, created_at as createdAt
      FROM app_user
      WHERE id = ?1
      `
    )
      .bind(userId)
      .first()

    if (!row) return errorJson(404, 'User not found')
    return json(row)
  }

  if (request.method === 'PUT') {
    const body = await parseJsonBody(request)
    if (!body) return errorJson(400, 'Invalid JSON body')

    const externalId = body.externalId != null ? String(body.externalId).trim() : null
    const displayName = body.displayName != null ? String(body.displayName).trim() : null
    const email = body.email != null ? String(body.email).trim() : null

    await env.DB.prepare(
      `
      UPDATE app_user SET
        external_id = COALESCE(?2, external_id),
        display_name = COALESCE(?3, display_name),
        email = ?4
      WHERE id = ?1
      `
    )
      .bind(userId, externalId, displayName, email)
      .run()

    const row = await env.DB.prepare(
      `
      SELECT id, external_id as externalId, display_name as displayName, email, created_at as createdAt
      FROM app_user
      WHERE id = ?1
      `
    )
      .bind(userId)
      .first()

    if (!row) return errorJson(404, 'User not found')
    return json(row)
  }

  return new Response('Method Not Allowed', { status: 405 })
}
