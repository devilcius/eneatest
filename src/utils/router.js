export const parsePath = () => {
  const path = window.location.pathname
  if (path.startsWith('/t/')) {
    return { page: 'test', token: path.replace('/t/', '').trim() }
  }
  if (path.startsWith('/admin')) {
    return { page: 'admin' }
  }
  return { page: 'home' }
}

export const navigateTo = (next) => {
  window.history.pushState({}, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
