export const generateToken = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const hashToken = async (token, env) => {
  const salt = env.TOKEN_SALT ?? ''
  const encoder = new TextEncoder()
  const data = encoder.encode(`${token}:${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
