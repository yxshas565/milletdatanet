import StatCard from '../components/StatCard.jsx'
import { useApi } from '../lib/api.js'

export default function Overview() {
  const { data, error, loading } = useApi(['/training/compare'])

  if (error) return <ErrorState message={error} />
  if (loading) return <Loading />

  const [compare] = data
  if (compare.error) return <ErrorState message={compare.error} />

  return (
    <div className="section-reveal">
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-strong)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
      }}>
        Pearl millet leaf classification — class-imbalance research
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)',
        fontWeight: 700, lineHeight: 1.05, margin: '0 0 18px', letterSpacing: '-0.01em',
      }}>
        A small dataset,<br />an honest fix,<br /><span style={{ color: 'var(--accent-strong)' }}>a traceable result.</span>
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-dim)', maxWidth: 560, lineHeight: 1.6, marginBottom: 36 }}>
        80 real leaf images, 3 classes, one badly underrepresented. This system shows the imbalance,
        fixes it, and keeps a full audit trail of every dataset version and training run — macro-F1
        improved from <strong style={{ color: 'var(--text)' }}>{compare.baseline.macro_f1.toFixed(3)}</strong> to{' '}
        <strong style={{ color: 'var(--accent-strong)' }}>{compare.augmented.macro_f1.toFixed(3)}</strong>.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Baseline macro-F1" value={compare.baseline.macro_f1.toFixed(4)} sub={compare.baseline.technique} delay={0} />
        <StatCard label="Best macro-F1" value={compare.augmented.macro_f1.toFixed(4)} sub={compare.augmented.technique} tone="accent" delay={0.1} />
        <StatCard label="Improvement" value={`+${compare.macro_f1_improvement.toFixed(4)}`} tone="amber" delay={0.2} />
      </div>
    </div>
  )
}

export function Loading() {
  return <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Loading field data&hellip;</p>
}

export function ErrorState({ message }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: `1px solid var(--danger)`,
      borderRadius: 'var(--radius)', padding: 24, color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 13,
    }}>{message}</div>
  )
}