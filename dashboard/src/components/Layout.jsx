import { NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/training', label: 'Training Runs' },
  { to: '/provenance', label: 'Dataset & Provenance' },
  { to: '/sensors', label: 'Sensor Stream' },
]

export default function Layout({ theme, setTheme, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .section-reveal { animation: fadeIn 0.5s ease both; }
        .nav-link {
          font-family: var(--font-mono); font-size: 12.5px; text-transform: uppercase;
          letter-spacing: 0.04em; color: var(--text-dim); text-decoration: none;
          padding: 8px 14px; border-radius: 999px; transition: all 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--text); background: var(--bg-elevated); }
        .nav-link.active { color: var(--accent-strong); background: var(--accent-glow); }
      `}</style>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(8px)', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>MilletDataNet</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>v1</span>
        </div>
        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 32px 80px', flex: 1, width: '100%' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer style={{
      padding: '24px 32px', borderTop: '1px solid var(--border)',
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      maxWidth: 980, margin: '0 auto', width: '100%',
    }}>
      <span>MilletDataNet — Pearl Millet Leaf Dataset (Zenodo, CC-BY-4.0)</span>
      <span>Built by Yashas Sadananda</span>
    </footer>
  )
}