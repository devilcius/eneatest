import { errorJson, json } from '../../../_utils/response'
import { hashToken } from '../../../_utils/token'
import { getTestDefinition } from '../../../_utils/testDefinition'

export async function onRequest(context) {
  const { env, params, request } = context

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const token = String(params.token)
  const tokenHash = await hashToken(token, env)

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
      u.external_id as externalId,
      u.display_name as displayName
    FROM test_session s
    JOIN app_user u ON u.id = s.user_id
    WHERE s.token = ?1
    LIMIT 1
    `
  )
    .bind(tokenHash)
    .first()

  if (!session) {
    return errorJson(404, 'Session not found')
  }

  const test = await getTestDefinition(env.DB, session.testDefinitionId, session.testDefinitionVersion)
  if (!test) {
    return errorJson(404, 'Test definition not found')
  }

  test.questionnaires = test.questionnaires.map((questionnaire) => ({
    ...questionnaire,
    items: questionnaire.items.filter((item) => item.isActive),
  }))

  let result = null
  if (session.status === 'COMPLETED') {
    const row = await env.DB.prepare(
      `
      SELECT totals_json, ranking_json
      FROM session_result
      WHERE session_id = ?1
      LIMIT 1
      `
    )
      .bind(session.id)
      .first()

    if (row) {
      result = {
        totals: JSON.parse(row.totals_json ?? '{}'),
        ranking: JSON.parse(row.ranking_json ?? '[]'),
      }
    }
  }

  return json({
    session: {
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      user: {
        id: session.userId,
        externalId: session.externalId,
        displayName: session.displayName,
      },
    },
    test,
    result,
  })
}
