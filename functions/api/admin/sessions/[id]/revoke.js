import { errorJson, json } from '../../../../_utils/response'

export async function onRequest(context) {
  const { env, params, request } = context
  const sessionId = Number(params.id)

  if (!Number.isFinite(sessionId)) {
    return errorJson(400, 'Invalid session id')
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `
    UPDATE test_session
    SET status = 'REVOKED', revoked_at = ?2
    WHERE id = ?1
    `
  )
    .bind(sessionId, now)
    .run()

  return json({ ok: true })
}
