import { errorJson, json, parseJsonBody } from '../../../_utils/response'

export async function onRequest(context) {
  const { env, request } = context

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      `
      SELECT id, external_id as externalId, display_name as displayName, email, created_at as createdAt
      FROM app_user
      ORDER BY created_at DESC
      `
    ).all()

    return json(rows.results)
  }

  if (request.method === 'POST') {
    const body = await parseJsonBody(request)
    if (!body) return errorJson(400, 'Invalid JSON body')

    const externalId = String(body.externalId ?? '').trim()
    const displayName = String(body.displayName ?? '').trim()
    const email = body.email != null ? String(body.email).trim() : null

    if (!externalId || !displayName) {
      return errorJson(400, 'externalId and displayName are required')
    }

    const existing = await env.DB.prepare(
      `
      SELECT id FROM app_user WHERE external_id = ?1 LIMIT 1
      `
    )
      .bind(externalId)
      .first()

    if (existing) {
      return errorJson(409, 'externalId already exists')
    }

    const createdAt = new Date().toISOString()

    const result = await env.DB.prepare(
      `
      INSERT INTO app_user (external_id, display_name, email, created_at)
      VALUES (?1, ?2, ?3, ?4)
      `
    )
      .bind(externalId, displayName, email, createdAt)
      .run()

    return json(
      {
        id: result.meta.last_row_id,
        externalId,
        displayName,
        email,
        createdAt,
      },
      201
    )
  }

  return new Response('Method Not Allowed', { status: 405 })
}
