import { errorJson, json, parseJsonBody } from '../../../../_utils/response'
import { hashToken } from '../../../../_utils/token'

const isValidValue = (value) => Number.isInteger(value) && value >= 0 && value <= 5

export async function onRequest(context) {
  const { env, params, request } = context

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const payload = await parseJsonBody(request)
  if (!payload || !Array.isArray(payload.answers)) {
    return errorJson(400, 'Invalid payload')
  }

  const token = String(params.token)
  const tokenHash = await hashToken(token, env)

  const session = await env.DB.prepare(
    `
    SELECT id, status, test_definition_id as testDefinitionId, test_definition_version as testDefinitionVersion
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

  if (session.status === 'REVOKED' || session.status === 'COMPLETED') {
    return errorJson(400, 'Session not editable')
  }

  const itemsQuery = await env.DB.prepare(
    `
    SELECT i.id as itemId, q.eneatype as eneatype
    FROM item i
    JOIN questionnaire q ON q.id = i.questionnaire_id
    WHERE q.test_definition_id = ?1 AND q.test_definition_version = ?2 AND i.is_active = 1
    ORDER BY q.order_index ASC, i.order_index ASC
    `
  )
    .bind(session.testDefinitionId, session.testDefinitionVersion)
    .all()

  const items = itemsQuery.results
  if (!items.length) {
    return errorJson(400, 'No active items found')
  }

  const answerMap = new Map()
  for (const answer of payload.answers) {
    const itemId = Number(answer.itemId)
    const value = Number(answer.value)
    if (!Number.isFinite(itemId) || !isValidValue(value)) {
      return errorJson(400, 'Invalid answer values')
    }
    answerMap.set(itemId, value)
  }

  const requiredItemIds = new Set(items.map((item) => item.itemId))
  if (answerMap.size !== requiredItemIds.size) {
    return errorJson(400, 'All active items must be answered')
  }

  for (const itemId of requiredItemIds) {
    if (!answerMap.has(itemId)) {
      return errorJson(400, 'All active items must be answered')
    }
  }

  const totals = {}
  items.forEach((item) => {
    const value = answerMap.get(item.itemId)
    totals[item.eneatype] = (totals[item.eneatype] ?? 0) + value
  })

  const ranking = Object.entries(totals)
    .map(([eneatype, score]) => ({ eneatype: Number(eneatype), score }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.eneatype - b.eneatype
    })

  const now = new Date().toISOString()

  const statements = []
  statements.push(
    env.DB.prepare('DELETE FROM item_response WHERE session_id = ?1').bind(session.id),
    env.DB.prepare('DELETE FROM session_result WHERE session_id = ?1').bind(session.id)
  )

  for (const [itemId, value] of answerMap.entries()) {
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO item_response (session_id, item_id, value, created_at)
        VALUES (?1, ?2, ?3, ?4)
        `
      ).bind(session.id, itemId, value, now)
    )
  }

  statements.push(
    env.DB.prepare(
      `
      INSERT INTO session_result (session_id, totals_json, ranking_json, created_at)
      VALUES (?1, ?2, ?3, ?4)
      `
    ).bind(session.id, JSON.stringify(totals), JSON.stringify(ranking), now)
  )

  statements.push(
    env.DB.prepare(
      `
      UPDATE test_session
      SET status = 'COMPLETED', completed_at = ?2
      WHERE id = ?1
      `
    ).bind(session.id, now)
  )

  await env.DB.batch(statements)

  return json({ ok: true, totals, ranking })
}
