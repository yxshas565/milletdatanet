import { useState } from 'react'

export default function ProvenancePanel({ apiBase, onStatusChange }) {
  const [imageId, setImageId] = useState('')
  const [provenance, setProvenance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [relabelValue, setRelabelValue] = useState('healthy')
  const [relabelReason, setRelabelReason] = useState('')
  const [status, setStatus] = useState('')

  const load = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/images/${id}/provenance`)
      const data = await res.json()
      setProvenance(data)
    } catch {
      setProvenance({ error: 'Could not load' })
    }
    setLoading(false)
  }

  const submitRelabel = async () => {
    if (!imageId) return
    const form = new FormData()
    form.append('new_label', relabelValue)
    form.append('changed_by', 'yashas')
    form.append('reason', relabelReason || 'manual correction via dashboard')
    const res = await fetch(`${apiBase}/images/${imageId}/relabel`, { method: 'POST', body: form })
    const data = await res.json()
    setStatus(`Corrected image #${data.image_id} \u2192 ${data.new_label}`)
    onStatusChange?.()
    load(imageId)
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)',
    }}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 0 }}>
        Enter an image ID (1&ndash;80) to inspect its full lineage, or submit a correction to see the audit trail update live.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="number" min="1" max="80" placeholder="Image ID"
          className="focus-ring"
          value={imageId}
          onChange={e => { setImageId(e.target.value); if (e.target.value) load(e.target.value) }}
          style={{ ...inputStyle, minWidth: 140 }}
        />
      </div>

      {loading && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading&hellip;</p>}

      {provenance && !provenance.error && (
        <div style={{ marginTop: 20 }}>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 12.5, overflowX: 'auto',
            background: 'var(--bg)', padding: 14, borderRadius: 10, border: '1px solid var(--border)',
            color: 'var(--text)',
          }}>{JSON.stringify(provenance, null, 2)}</pre>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
              Correct this label
            </h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select className="focus-ring" value={relabelValue} onChange={e => setRelabelValue(e.target.value)} style={{ ...inputStyle, width: 140, cursor: 'pointer' }}>
                <option value="healthy">healthy</option>
                <option value="sclpgr">sclpgr</option>
                <option value="drecro">drecro</option>
              </select>
              <input
                className="focus-ring"
                placeholder="Reason for correction"
                value={relabelReason}
                onChange={e => setRelabelReason(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <button className="focus-ring" onClick={submitRelabel} style={buttonStyle}>
                Submit correction
              </button>
            </div>
            {status && <p style={{ color: 'var(--accent-strong)', fontSize: 13, marginTop: 10, fontFamily: 'var(--font-mono)' }}>{status}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
  padding: '10px 12px', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13,
}

const buttonStyle = {
  background: 'var(--accent)', color: '#FFFDF7', border: 'none',
  padding: '10px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 13, transition: 'background 0.2s ease',
}