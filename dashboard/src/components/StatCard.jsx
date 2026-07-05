export default function StatCard({ label, value, sub, tone = 'neutral', delay = 0 }) {
  const toneColor = tone === 'accent' ? 'var(--accent-strong)' : tone === 'amber' ? 'var(--amber)' : 'var(--text)'
  return (
    <div
      className="stat-card"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${tone !== 'neutral' ? toneColor : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '20px 22px', minWidth: 190,
        maxWidth: '100%', boxSizing: 'border-box',
        boxShadow: 'var(--shadow)', flex: '1 1 190px',
        animation: `riseIn 0.6s ease ${delay}s both`,
        overflow: 'hidden',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
        color: toneColor, lineHeight: 1,
        overflowWrap: 'break-word', wordBreak: 'break-word',
      }}>{value}</div>
      {sub && <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{sub}</div>}
    </div>
  )
}