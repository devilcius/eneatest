const request = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    let errorPayload = null
    try {
      errorPayload = await response.json()
    } catch (error) {
      errorPayload = null
    }

    const message = errorPayload?.error?.message ?? response.statusText
    const error = new Error(message)
    error.status = response.status
    error.details = errorPayload?.error?.details
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  getUsers: () => request('/api/admin/users'),
  createUser: (payload) =>
    request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSessions: (params = {}) => {
    const search = new URLSearchParams(params)
    return request(`/api/admin/sessions${search.toString() ? `?${search}` : ''}`)
  },
  createSession: (userId) => request(`/api/admin/users/${userId}/session`, { method: 'POST' }),
  getTest: () => request('/api/admin/test'),
  getTestDefinition: (id, version) => request(`/api/admin/test/${id}/${version}`),
  updateItem: (itemId, payload) =>
    request(`/api/admin/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  revokeSession: (sessionId) =>
    request(`/api/admin/sessions/${sessionId}/revoke`, { method: 'POST' }),
  resetSession: (sessionId) =>
    request(`/api/admin/sessions/${sessionId}/reset`, { method: 'POST' }),
  deleteSession: (sessionId) =>
    request(`/api/admin/sessions/${sessionId}/delete`, { method: 'POST' }),
  getSessionDetail: (sessionId) => request(`/api/admin/sessions/${sessionId}`),
  getPublicSession: (token) => request(`/api/public/session/${token}`),
  startSession: (token) => request(`/api/public/session/${token}/start`, { method: 'POST' }),
  submitSession: (token, payload) =>
    request(`/api/public/session/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
