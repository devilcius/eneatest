export const nextId = (items) => (items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1)
