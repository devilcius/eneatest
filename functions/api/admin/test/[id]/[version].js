import { errorJson, json } from '../../../../_utils/response'
import { getTestDefinition } from '../../../../_utils/testDefinition'

export async function onRequest(context) {
  const { env, params, request } = context

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const testId = String(params.id)
  const version = Number(params.version)

  if (!testId || !Number.isFinite(version)) {
    return errorJson(400, 'Invalid test definition')
  }

  const test = await getTestDefinition(env.DB, testId, version)
  if (!test) return errorJson(404, 'Test definition not found')

  return json(test)
}
