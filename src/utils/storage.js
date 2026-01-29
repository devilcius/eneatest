export const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (error) {
    console.error('Storage error', error)
    return fallback
  }
}

export const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}
