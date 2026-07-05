import { useEffect, useState } from 'react'

export const API_BASE = 'http://localhost:8000'

export function useApi(paths, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    Promise.all(paths.map(p => fetch(`${API_BASE}${p}`).then(r => r.json())))
      .then(results => { setData(results); setLoading(false) })
      .catch(() => { setError('Could not reach the provenance service. Make sure it is running on port 8000.'); setLoading(false) })
  }

  useEffect(() => { reload() }, deps)

  return { data, error, loading, reload }
}

export function buildPerClassData(runs, techniqueA, techniqueB) {
  const a = runs.find(r => r.technique === techniqueA)
  const b = runs.find(r => r.technique === techniqueB)
  if (!a || !b) return []
  const aReport = JSON.parse(a.per_class_report)
  const bReport = JSON.parse(b.per_class_report)
  const classes = Array.from(new Set([...Object.keys(aReport), ...Object.keys(bReport)]))
    .filter(k => !['accuracy', 'macro avg', 'weighted avg'].includes(k))
  return classes.map(c => ({
    name: c,
    a: aReport[c] ? aReport[c]['f1-score'] : 0,
    b: bReport[c] ? bReport[c]['f1-score'] : 0,
  }))
}