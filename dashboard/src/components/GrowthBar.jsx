import { useEffect, useState } from 'react'

export default function GrowthBarChart({ data }) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 150)
    return () => clearTimeout(t)
  }, [])

  const maxHeight = 200

  return (
    <div style={{
      display: 'flex', gap: 32, alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '32px 24px 16px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: maxHeight }}>
            <Stalk value={d.baseline} max={1} color="var(--text-dim)" grown={grown} delay={i * 0.12} label={d.baseline.toFixed(2)} height={maxHeight} />
            <Stalk value={d.augmented} max={1} color="var(--accent)" grown={grown} delay={i * 0.12 + 0.15} label={d.augmented.toFixed(2)} height={maxHeight} glow />
          </div>
          <div style={{
            marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)',
          }}>{d.name}</div>
        </div>
      ))}
    </div>
  )
}

function Stalk({ value, max, color, grown, delay, label, height, glow }) {
  const targetHeight = Math.max(4, (value / max) * height)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color, marginBottom: 6,
        opacity: grown ? 1 : 0, transition: `opacity 0.4s ease ${delay + 0.5}s`,
      }}>{label}</div>
      <div style={{
        width: '100%',
        height: grown ? targetHeight : 0,
        background: color,
        borderRadius: '6px 6px 3px 3px',
        transition: `height 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        boxShadow: glow ? `0 0 16px var(--accent-glow)` : 'none',
      }} />
    </div>
  )
}