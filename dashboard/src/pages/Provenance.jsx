import ProvenancePanel from '../components/ProvenancePanel.jsx'
import { useApi } from '../lib/api.js'
import { Loading, ErrorState } from './Overview.jsx'

export default function Provenance() {
  const { data, error, loading, reload } = useApi(['/datasets/1/card'])

  if (error) return <ErrorState message={error} />
  if (loading) return <Loading />

  const [card] = data

  return (
    <div className="section-reveal">
      <Header eyebrow="Dataset" title="Dataset card, version 1" />
      {!card.error && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)', marginBottom: 48 }}>
          <Row label="Source" value={card.source} />
          <Row label="Version" value={card.version?.version_tag} />
          <Row label="Checksum" value={card.version?.manifest_checksum} mono />
          <Row label="Class distribution" value={Object.entries(card.class_distribution || {}).map(([k, v]) => `${k}: ${v}`).join('  ·  ')} mono />
          <Row label="Known limitations" value={card.known_limitations} />
        </div>
      )}

      <Header eyebrow="Live audit" title="Provenance viewer" />
      <ProvenancePanel apiBase="http://localhost:8000" onStatusChange={reload} />
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <div style={{ width: 160, flexShrink: 0, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}>{value}</div>
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