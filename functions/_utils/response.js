export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })

export const errorJson = (status, message, details) =>
  json(
    {
      error: {
        message,
        details,
      },
    },
    status
  )

export const parseJsonBody = async (request) => {
  try {
    return await request.json()
  } catch (error) {
    return null
  }
}
