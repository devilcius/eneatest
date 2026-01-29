export const parseHash = () => {
  const raw = window.location.hash.replace('#', '')
  if (raw.startsWith('/t/')) {
    return { page: 'test', token: raw.replace('/t/', '').trim() }
  }
  if (raw.startsWith('/admin')) {
    return { page: 'admin' }
  }
  return { page: 'home' }
}

export const navigateTo = (next) => {
  window.location.hash = next
}
