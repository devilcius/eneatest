import { errorJson, json } from '../../../../_utils/response'
import { hashToken } from '../../../../_utils/token'

export async function onRequest(context) {
  const { env, params, request } = context

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const token = String(params.token)
  const tokenHash = await hashToken(token, env)

  const session = await env.DB.prepare(
    `
    SELECT id, status
    FROM test_session
    WHERE token = ?1
    LIMIT 1
    `
  )
    .bind(tokenHash)
    .first()

  if (!session) {
    return errorJson(404, 'Session not found')
  }

  if (session.status === 'CREATED') {
    await env.DB.prepare(
      `
      UPDATE test_session
      SET status = 'STARTED', started_at = ?2
      WHERE id = ?1
      `
    )
      .bind(session.id, new Date().toISOString())
      .run()
  }

  return json({ ok: true })
}
