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

  const statements = [
    env.DB.prepare('DELETE FROM item_response WHERE session_id = ?1').bind(sessionId),
    env.DB.prepare('DELETE FROM session_result WHERE session_id = ?1').bind(sessionId),
    env.DB.prepare(
      `
      UPDATE test_session
      SET status = 'CREATED', started_at = NULL, completed_at = NULL, revoked_at = NULL
      WHERE id = ?1
      `
    ).bind(sessionId),
  ]

  await env.DB.batch(statements)

  return json({ ok: true })
}
