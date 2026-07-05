// import { useEffect, useState } from 'react'
// import ThemeToggle from './components/ThemeToggle.jsx'
// import StatCard from './components/StatCard.jsx'
// import GrowthBarChart from './components/GrowthBar.jsx'
// import ProvenancePanel from './components/ProvenancePanel.jsx'

// const API_BASE = 'http://localhost:8000'

// export default function App() {
//   const [theme, setTheme] = useState(() => localStorage.getItem('mdn-theme') || 'dark')
//   const [compare, setCompare] = useState(null)
//   const [runs, setRuns] = useState([])
//   const [card, setCard] = useState(null)
//   const [sensors, setSensors] = useState([])
//   const [error, setError] = useState(null)
//   const [loaded, setLoaded] = useState(false)

//   useEffect(() => {
//     document.documentElement.setAttribute('data-theme', theme)
//     localStorage.setItem('mdn-theme', theme)
//   }, [theme])

//   const loadAll = () => {
//     Promise.all([
//       fetch(`${API_BASE}/training/compare`).then(r => r.json()),
//       fetch(`${API_BASE}/training/runs`).then(r => r.json()),
//       fetch(`${API_BASE}/datasets/1/card`).then(r => r.json()),
//       fetch(`${API_BASE}/sensors/readings`).then(r => r.json()).catch(() => []),
//     ])
//       .then(([c, r, d, s]) => { setCompare(c); setRuns(r); setCard(d); setSensors(s); setLoaded(true) })
//       .catch(() => setError('Could not reach the provenance service. Make sure it is running on port 8000.'))
//   }

//   useEffect(() => { loadAll() }, [])

//   if (error) return (
//     <Shell theme={theme} setTheme={setTheme}>
//       <ErrorState message={error} />
//     </Shell>
//   )

//   if (!loaded) return (
//     <Shell theme={theme} setTheme={setTheme}>
//       <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Loading field data&hellip;</p>
//     </Shell>
//   )

//   const perClassData = buildPerClassData(runs)
//   const latestSensor = sensors[0]

//   return (
//     <Shell theme={theme} setTheme={setTheme}>
//       <Hero compare={compare} />

//       <Section eyebrow="01 \u2014 Results" title="Baseline vs. rebalanced training">
//         <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
//           <StatCard label="Baseline macro-F1" value={compare.baseline.macro_f1.toFixed(4)} sub={compare.baseline.technique} delay={0} />
//           <StatCard label="Rebalanced macro-F1" value={compare.augmented.macro_f1.toFixed(4)} sub={compare.augmented.technique} tone="accent" delay={0.1} />
//           <StatCard label="Improvement" value={`+${compare.macro_f1_improvement.toFixed(4)}`} tone="amber" delay={0.2} />
//         </div>
//         <GrowthBarChart data={perClassData} />
//         <Legend />
//       </Section>

//       {card && (
//         <Section eyebrow="02 \u2014 Provenance" title="Dataset card, version 1">
//           <div style={{
//             background: 'var(--bg-elevated)', border: '1px solid var(--border)',
//             borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)',
//           }}>
//             <DatasetCardView card={card} />
//           </div>
//         </Section>
//       )}

//       <Section eyebrow="03 \u2014 Live audit" title="Provenance viewer">
//         <ProvenancePanel apiBase={API_BASE} onStatusChange={loadAll} />
//       </Section>

//       {sensors.length > 0 && (
//         <Section eyebrow="04 \u2014 Field simulation" title="IoT sensor stream (simulated reference architecture)">
//           <div style={{
//             background: 'var(--bg-elevated)', border: '1px solid var(--border)',
//             borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)',
//           }}>
//             {latestSensor && (
//               <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
//                 <StatCard label="Predicted stage" value={latestSensor.predicted_growth_stage} tone="accent" />
//                 <StatCard label="Soil moisture" value={`${latestSensor.soil_moisture_pct}%`} />
//                 <StatCard label="Temperature" value={`${latestSensor.temperature_c}\u00b0C`} />
//                 <StatCard label="Humidity" value={`${latestSensor.humidity_pct}%`} />
//               </div>
//             )}
//             <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
//               {sensors.length} readings captured via MQTT \u2014 simulated sensor stream, not live hardware.
//             </p>
//           </div>
//         </Section>
//       )}

//       <Section eyebrow="05 \u2014 Log" title="Training run history">
//         <RunsTable runs={runs} />
//       </Section>

//       <Footer />
//     </Shell>
//   )
// }

// function Shell({ theme, setTheme, children }) {
//   return (
//     <div style={{ minHeight: '100vh' }}>
//       <style>{`
//         @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         .section-reveal { animation: fadeIn 0.7s ease both; }
//       `}</style>
//       <header style={{
//         position: 'sticky', top: 0, zIndex: 10,
//         display: 'flex', justifyContent: 'space-between', alignItems: 'center',
//         padding: '18px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
//         backdropFilter: 'blur(8px)',
//       }}>
//         <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
//           <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>MilletDataNet</span>
//           <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>v1</span>
//         </div>
//         <ThemeToggle theme={theme} setTheme={setTheme} />
//       </header>
//       <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 32px 80px' }}>
//         {children}
//       </main>
//     </div>
//   )
// }

// function Hero({ compare }) {
//   return (
//     <div className="section-reveal" style={{ marginBottom: 56 }}>
//       <div style={{
//         fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-strong)',
//         textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
//       }}>
//         Pearl millet leaf classification \u2014 class-imbalance research
//       </div>
//       <h1 style={{
//         fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)',
//         fontWeight: 700, lineHeight: 1.05, margin: '0 0 18px', letterSpacing: '-0.01em',
//       }}>
//         A small dataset,<br />an honest fix,<br /><span style={{ color: 'var(--accent-strong)' }}>a traceable result.</span>
//       </h1>
//       <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-dim)', maxWidth: 560, lineHeight: 1.6 }}>
//         80 real leaf images, 3 classes, one badly underrepresented. This system shows the imbalance,
//         fixes it, and keeps a full audit trail of every dataset version and training run \u2014
//         macro-F1 improved from <strong style={{ color: 'var(--text)' }}>{compare.baseline.macro_f1.toFixed(3)}</strong> to{' '}
//         <strong style={{ color: 'var(--accent-strong)' }}>{compare.augmented.macro_f1.toFixed(3)}</strong>.
//       </p>
//     </div>
//   )
// }

// function Section({ eyebrow, title, children }) {
//   return (
//     <section className="section-reveal" style={{ marginBottom: 56 }}>
//       <div style={{
//         fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
//         textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
//       }}>{eyebrow}</div>
//       <h2 style={{
//         fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 20px',
//       }}>{title}</h2>
//       {children}
//     </section>
//   )
// }

// function Legend() {
//   return (
//     <div style={{ display: 'flex', gap: 20, marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
//       <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
//         <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--text-dim)', display: 'inline-block' }} /> Baseline
//       </span>
//       <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
//         <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} /> Rebalanced
//       </span>
//     </div>
//   )
// }

// function DatasetCardView({ card }) {
//   const dist = card.class_distribution || {}
//   return (
//     <div>
//       <Row label="Source" value={card.source} />
//       <Row label="Version" value={card.version?.version_tag} />
//       <Row label="Checksum" value={card.version?.manifest_checksum} mono />
//       <Row label="Class distribution" value={Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join('  \u00b7  ')} mono />
//       <Row label="Known limitations" value={card.known_limitations} />
//     </div>
//   )
// }

// function Row({ label, value, mono }) {
//   return (
//     <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
//       <div style={{ width: 160, flexShrink: 0, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>{label}</div>
//       <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}>{value}</div>
//     </div>
//   )
// }

// function RunsTable({ runs }) {
//   return (
//     <div style={{
//       background: 'var(--bg-elevated)', border: '1px solid var(--border)',
//       borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)',
//     }}>
//       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
//         <thead>
//           <tr style={{ background: 'var(--bg)' }}>
//             {['Model', 'Technique', 'Macro-F1', 'Created'].map(h => (
//               <th key={h} style={{
//                 textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-mono)',
//                 fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)',
//                 borderBottom: '1px solid var(--border)',
//               }}>{h}</th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {runs.map(r => (
//             <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
//               <td style={{ padding: '12px 16px' }}>{r.model_name}</td>
//               <td style={{ padding: '12px 16px', color: 'var(--text-dim)' }}>{r.technique}</td>
//               <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.macro_f1.toFixed(4)}</td>
//               <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.created_at?.slice(0, 19)}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }

// function ErrorState({ message }) {
//   return (
//     <div style={{
//       background: 'var(--bg-elevated)', border: `1px solid var(--danger)`,
//       borderRadius: 'var(--radius)', padding: 24, color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 13,
//     }}>{message}</div>
//   )
// }

// function Footer() {
//   return (
//     <footer style={{
//       marginTop: 60, paddingTop: 24, borderTop: '1px solid var(--border)',
//       fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
//       display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
//     }}>
//       <span>MilletDataNet \u2014 Pearl Millet Leaf Dataset (Zenodo, CC-BY-4.0)</span>
//       <span>Built by Yashas Sadananda</span>
//     </footer>
//   )
// }

// function buildPerClassData(runs) {
//   const baseline = runs.find(r => r.technique === 'unweighted_baseline')
//   const augmented = runs.find(r => r.technique === 'class_weighted_oversampled')
//   if (!baseline || !augmented) return []
//   const bReport = JSON.parse(baseline.per_class_report)
//   const aReport = JSON.parse(augmented.per_class_report)
//   const classes = ['healthy', 'sclpgr', 'drecro']
//   return classes.map(c => ({
//     name: c,
//     baseline: bReport[c] ? bReport[c]['f1-score'] : 0,
//     augmented: aReport[c] ? aReport[c]['f1-score'] : 0,
//   }))
// }




















import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Overview from './pages/Overview.jsx'
import Training from './pages/Training.jsx'
import Provenance from './pages/Provenance.jsx'
import Sensors from './pages/Sensors.jsx'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('mdn-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mdn-theme', theme)
  }, [theme])

  return (
    <Layout theme={theme} setTheme={setTheme}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/training" element={<Training />} />
        <Route path="/provenance" element={<Provenance />} />
        <Route path="/sensors" element={<Sensors />} />
      </Routes>
    </Layout>
  )
}