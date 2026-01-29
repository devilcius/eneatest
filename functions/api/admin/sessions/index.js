import { json } from '../../../_utils/response'

export async function onRequest(context) {
  const { env, request } = context

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const status = (url.searchParams.get('status') ?? '').trim()
  const search = (url.searchParams.get('search') ?? '').trim()

  const rows = await env.DB.prepare(
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
    WHERE (?1 = '' OR s.status = ?1)
      AND (?2 = '' OR LOWER(u.display_name) LIKE '%' || LOWER(?2) || '%' OR LOWER(u.external_id) LIKE '%' || LOWER(?2) || '%')
    ORDER BY s.created_at DESC
    `
  )
    .bind(status, search)
    .all()

  return json(rows.results)
}
