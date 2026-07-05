import { useState, useEffect, useRef, useCallback } from 'react'
import GrowthBarChart from '../components/GrowthBar.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, buildPerClassData, API_BASE } from '../lib/api.js'
import { Loading, ErrorState } from './Overview.jsx'

const RUN_OPTIONS = [
  { key: 'baseline', label: 'Baseline (unweighted)' },
  { key: 'augmented', label: 'Augmented (class-weighted + oversampled)' },
  { key: 'synthetic', label: 'Synthetic (+ diffusion)' },
]

export default function Training() {
  const { data, error, loading, reload } = useApi(['/training/runs'])
  const [runA, setRunA] = useState(null)
  const [runB, setRunB] = useState(null)
  const [job, setJob] = useState(null)
  const pollRef = useRef(null)
  const activeJobId = useRef(null)

  const pollStatus = useCallback((jobId) => {
    fetch(`${API_BASE}/training/status/${jobId}`)
      .then(r => r.json())
      .then(statusData => {
        setJob(statusData)
        if (statusData.status === 'done' || statusData.status === 'error') {
          clearInterval(pollRef.current)
          pollRef.current = null
          activeJobId.current = null
          if (statusData.status === 'done') reload()
        }
      })
      .catch(() => {})
  }, [reload])

  // Resume polling when tab regains focus, in case the interval was throttled/paused
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeJobId.current) {
        pollStatus(activeJobId.current)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pollStatus])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const triggerTraining = async (runType) => {
    const form = new FormData()
    form.append('run', runType)
    const res = await fetch(`${API_BASE}/training/trigger`, { method: 'POST', body: form })
    const result = await res.json()
    if (result.error) {
      setJob({ status: 'error', log: result.error })
      return
    }
    setJob({ job_id: result.job_id, status: 'queued', script: runType })
    activeJobId.current = result.job_id
    pollRef.current = setInterval(() => pollStatus(result.job_id), 4000)
  }

  if (error) return <ErrorState message={error} />
  if (loading) return <Loading />

  const [runs] = data
  const a = runA ?? runs[0]?.id
  const b = runB ?? runs[runs.length - 1]?.id
  const runAObj = runs.find(r => r.id === a)
  const runBObj = runs.find(r => r.id === b)
  const perClassData = runAObj && runBObj ? buildPerClassData(runs, runAObj.technique, runBObj.technique) : []
  const delta = runAObj && runBObj ? (runBObj.macro_f1 - runAObj.macro_f1) : 0

  return (
    <div className="section-reveal">
      <Header eyebrow="Training" title="Run training live" />
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -12, marginBottom: 20 }}>
        Triggers the actual PyTorch 5-fold CV script on the server. Takes a few minutes on CPU — this runs server-side regardless of this tab; switching tabs just pauses status polling, which resumes automatically when you come back.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {RUN_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className="focus-ring"
            onClick={() => triggerTraining(opt.key)}
            disabled={job && job.status !== 'done' && job.status !== 'error'}
            style={buttonStyle}
          >
            Run {opt.label}
          </button>
        ))}
      </div>

      {job && <JobStatus job={job} />}

      <div style={{ marginTop: 48 }}>
        <Header eyebrow="Compare" title="Compare any two runs" />
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <Selector value={a} onChange={setRunA} runs={runs} />
          <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>vs</span>
          <Selector value={b} onChange={setRunB} runs={runs} />
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard label={runAObj?.technique} value={runAObj?.macro_f1.toFixed(4)} delay={0} />
          <StatCard label={runBObj?.technique} value={runBObj?.macro_f1.toFixed(4)} tone="accent" delay={0.1} />
          <StatCard label="Delta" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(4)}`} tone={delta >= 0 ? 'amber' : 'neutral'} delay={0.2} />
        </div>

        {perClassData.length > 0 && (
          <>
            <GrowthBarChart data={perClassData.map(d => ({ name: d.name, baseline: d.a, augmented: d.b }))} />
            <Legend />
          </>
        )}
      </div>

      <div style={{ marginTop: 48 }}>
        <Header eyebrow="Log" title="All training runs" />
        <RunsTable runs={runs} />
      </div>
    </div>
  )
}

function JobStatus({ job }) {
  const color = job.status === 'error' ? 'var(--danger)' : job.status === 'done' ? 'var(--accent-strong)' : 'var(--amber)'
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: `1px solid ${color}`, borderRadius: 'var(--radius)',
      padding: 16, marginBottom: 28, fontFamily: 'var(--font-mono)', fontSize: 12.5,
    }}>
      <div style={{ color, fontWeight: 600, marginBottom: job.log ? 10 : 0, textTransform: 'uppercase' }}>
        {job.script ? `${job.script} — ${job.status}` : job.status}
      </div>
      {job.log && (
        <pre style={{
          maxHeight: 240, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap',
          color: 'var(--text-dim)', fontSize: 11.5,
        }}>{job.log.slice(-3000)}</pre>
      )}
    </div>
  )
}

function Selector({ value, onChange, runs }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = runs.find(r => r.id === value)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 280 }}>
      <button
        type="button"
        className="focus-ring"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)',
          padding: '10px 12px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}
      >
        <span>{selected ? `${selected.technique} (${selected.macro_f1.toFixed(3)})` : 'Select a run'}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: 'var(--shadow)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {runs.map(r => (
            <div
              key={r.id}
              onClick={() => { onChange(r.id); setOpen(false) }}
              style={{
                padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12.5,
                color: r.id === value ? 'var(--accent-strong)' : 'var(--text)',
                background: r.id === value ? 'var(--accent-glow)' : 'transparent',
              }}
              onMouseEnter={e => { if (r.id !== value) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (r.id !== value) e.currentTarget.style.background = 'transparent' }}
            >
              {r.technique} ({r.macro_f1.toFixed(3)})
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--text-dim)', display: 'inline-block' }} /> Run A
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} /> Run B
      </span>
    </div>
  )
}

function Header({ eyebrow, title }) {
  return (
    <>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{eyebrow}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 20px' }}>{title}</h2>
    </>
  )
}

function RunsTable({ runs }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg)' }}>
            {['Model', 'Technique', 'Macro-F1', 'Created'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 16px' }}>{r.model_name}</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-dim)' }}>{r.technique}</td>
              <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.macro_f1.toFixed(4)}</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.created_at?.slice(0, 19)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const buttonStyle = {
  background: 'var(--bg-elevated)', border: '1px solid var(--accent)', color: 'var(--accent-strong)',
  padding: '10px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-mono)', fontSize: 12.5, transition: 'all 0.2s ease',
}