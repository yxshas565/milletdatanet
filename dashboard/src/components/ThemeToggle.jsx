export default function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === 'dark'
  return (
    <button
      className="focus-ring"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 999, padding: '6px 14px 6px 6px', cursor: 'pointer',
        color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12,
        boxShadow: 'var(--shadow)', transition: 'all 0.3s ease',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: isDark ? 'var(--accent)' : 'var(--amber)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.3s ease', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12 }}>{isDark ? '\u2600' : '\u263D'}</span>
      </span>
      {isDark ? 'LIGHT' : 'DARK'}
    </button>
  )
}