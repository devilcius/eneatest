import { errorJson, json } from '../../../_utils/response'

export async function onRequest(context) {
  const { env, params, request } = context
  const sessionId = Number(params.id)

  if (!Number.isFinite(sessionId)) {
    return errorJson(400, 'Invalid session id')
  }

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const session = await env.DB.prepare(
    `
    SELECT
      s.id,
      s.status,
      s.test_definition_id as testDefinitionId,
      s.test_definition_version as testDefinitionVersion,
      s.user_id as userId,
      s.created_at as createdAt,
      s.started_at as startedAt,
      s.completed_at as completedAt,
      s.revoked_at as revokedAt,
      u.external_id as externalId,
      u.display_name as displayName
    FROM test_session s
    JOIN app_user u ON u.id = s.user_id
    WHERE s.id = ?1
    LIMIT 1
    `
  )
    .bind(sessionId)
    .first()

  if (!session) return errorJson(404, 'Session not found')

  const resultRow = await env.DB.prepare(
    `
    SELECT totals_json, ranking_json
    FROM session_result
    WHERE session_id = ?1
    `
  )
    .bind(sessionId)
    .first()

  const responsesRow = await env.DB.prepare(
    `
    SELECT item_id as itemId, value
    FROM item_response
    WHERE session_id = ?1
    `
  )
    .bind(sessionId)
    .all()

  return json({
    session,
    result: resultRow
      ? {
          totals: JSON.parse(resultRow.totals_json ?? '{}'),
          ranking: JSON.parse(resultRow.ranking_json ?? '[]'),
        }
      : null,
    responses: responsesRow.results,
  })
}
