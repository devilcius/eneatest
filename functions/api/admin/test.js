import { errorJson, json } from '../../_utils/response'
import { getActiveTestDefinition } from '../../_utils/testDefinition'

export async function onRequest(context) {
  const { env, request } = context

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const test = await getActiveTestDefinition(env.DB)
  if (!test) return errorJson(404, 'No hay definidos tests activos')

  return json(test)
}
