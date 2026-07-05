import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import { API_BASE } from '../lib/api.js'
import { Loading, ErrorState } from './Overview.jsx'

export default function Sensors() {
  const [readings, setReadings] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReadings = () => {
      fetch(`${API_BASE}/sensors/readings`)
        .then(r => r.json())
        .then(setReadings)
        .catch(() => setError('Could not reach the provenance service.'))
    }
    fetchReadings()
    const interval = setInterval(fetchReadings, 3000)
    return () => clearInterval(interval)
  }, [])

  if (error) return <ErrorState message={error} />
  if (!readings) return <Loading />
  if (readings.length === 0) return <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>No sensor readings yet. Run the simulator and subscriber, then refresh.</p>

  const latest = readings[0]
  const chronological = [...readings].reverse()

  return (
    <div className="section-reveal">
      <Header eyebrow="Field simulation" title="IoT sensor stream" />
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -12, marginBottom: 28 }}>
        Polling every 3s — {readings.length} readings captured via MQTT. Simulated reference architecture, not live hardware.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Predicted stage" value={latest.predicted_growth_stage} tone="accent" delay={0} />
        <StatCard label="Soil moisture" value={`${latest.soil_moisture_pct}%`} delay={0.05} />
        <StatCard label="Temperature" value={`${latest.temperature_c}°C`} delay={0.1} />
        <StatCard label="Humidity" value={`${latest.humidity_pct}%`} delay={0.15} />
      </div>

      <MoistureTrend data={chronological} />
    </div>
  )
}

function MoistureTrend({ data }) {
  const width = 900, height = 200, pad = 20
  const values = data.map(d => d.soil_moisture_pct)
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (width - pad * 2)
    const y = height - pad - ((d.soil_moisture_pct - min) / range) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Soil moisture % over time
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
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