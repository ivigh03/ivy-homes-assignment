import { useState, useCallback } from 'react'

const KEY = 'ivy_favourites'

function readIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function persistIds(ids) {
  localStorage.setItem(KEY, JSON.stringify([...ids]))
}

export function useFavourites() {
  const [ids, setIds] = useState(readIds)

  const toggle = useCallback((id) => {
    setIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistIds(next)
      return next
    })
  }, [])

  const remove = useCallback((id) => {
    setIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      persistIds(next)
      return next
    })
  }, [])

  return {
    ids,
    isSaved: (id) => ids.has(id),
    toggle,
    remove,
  }
}
