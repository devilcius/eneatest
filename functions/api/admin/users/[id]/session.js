import { errorJson, json } from '../../../../_utils/response'
import { generateToken, hashToken } from '../../../../_utils/token'
import { getActiveTestDefinition } from '../../../../_utils/testDefinition'

export async function onRequest(context) {
  const { env, params, request } = context
  const userId = Number(params.id)

  if (!Number.isFinite(userId)) {
    return errorJson(400, 'Invalid user id')
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const user = await env.DB.prepare('SELECT id, display_name as displayName FROM app_user WHERE id = ?1')
    .bind(userId)
    .first()

  if (!user) return errorJson(404, 'User not found')

  const test = await getActiveTestDefinition(env.DB)
  if (!test) return errorJson(400, 'No active test definition')

  const token = generateToken()
  const tokenHash = await hashToken(token, env)
  const createdAt = new Date().toISOString()

  const result = await env.DB.prepare(
    `
    INSERT INTO test_session (
      test_definition_id,
      test_definition_version,
      user_id,
      token,
      status,
      created_at
    )
    VALUES (?1, ?2, ?3, ?4, 'CREATED', ?5)
    `
  )
    .bind(test.id, test.version, userId, tokenHash, createdAt)
    .run()

  return json(
    {
      id: result.meta.last_row_id,
      token,
      createdAt,
      status: 'CREATED',
      testDefinitionId: test.id,
      testDefinitionVersion: test.version,
      userId,
      displayName: user.displayName,
    },
    201
  )
}
