import { fmtMB, fmtKB } from './ModelReportPanel'

const SLOT_COLORS = {
  normal: '#818cf8', emissive: '#fb923c', occlusion: '#a3e635', metallic: '#94a3b8',
  roughness: '#94a3b8', baseColor: '#60a5fa', alpha: '#f472b6', lightmap: '#fbbf24',
  environment: '#34d399', displacement: '#f87171', clearcoat: '#c084fc',
  transmission: '#38bdf8', thickness: '#6ee7b7',
}

function slotColor(label) {
  const lower = label.toLowerCase()
  for (const [key, color] of Object.entries(SLOT_COLORS)) {
    if (lower.includes(key)) return color
  }
  return '#60a5fa'
}

function shortFormat(mimeType) {
  if (mimeType.includes('ktx2')) return 'KTX2'
  if (mimeType.includes('basis')) return 'BASIS'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG'
  if (mimeType.includes('png')) return 'PNG'
  if (mimeType.includes('webp')) return 'WEBP'
  return mimeType.split('/')[1]?.toUpperCase() || '—'
}

function shortSlot(slot) { return slot.replace(/Texture$/, '').replace(/Map$/, '') }

function TextureCard({ t }) {
  const primarySlot = t.slots.length > 0 ? shortSlot(t.slots[0]) : '—'
  const color = slotColor(primarySlot)
  const fmt = shortFormat(t.mimeType)

  const iconBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }

  const rows = [
    { label: 'slots', value: primarySlot, badge: true, color },
    { label: 'format', value: fmt, badge: true, color: '#94a3b8' },
    { label: 'resolution', value: t.width && t.height ? `${t.width}x${t.height}` : '—' },
    { label: 'index', value: String(t.id) },
    { label: 'name', value: t.name || '**' },
    { label: 'users', value: String(t.instances) },
    { label: 'size', value: fmtKB(t.fileSizeKB) },
    { label: 'VRAM', value: t.estimatedMemoryMB > 0 ? fmtMB(t.estimatedMemoryMB) : '—' },
  ]

  return (
    <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', background: '#020617', flexShrink: 0 }}>
        {t.thumbnailUrl ? (
          <img src={t.thumbnailUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: '#1e293b', fontSize: 10 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>◻</span>
            <span>{t.compression !== 'None' ? t.compression : 'No Preview'}</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => { if (t.thumbnailUrl) { const a = document.createElement('a'); a.href = t.thumbnailUrl; a.download = t.name || `texture_${t.id}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a) } }} style={iconBtn} title="Download">↓</button>
          <button onClick={() => navigator.clipboard?.writeText(t.name || String(t.id)).catch(() => {})} style={iconBtn} title="Copy name">⎘</button>
        </div>
        {t.compression !== 'None' && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(130,160,141,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 3, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em' }}>{t.compression}</div>
        )}
      </div>
      <div style={{ padding: '5px 8px 7px', fontSize: 10, fontFamily: 'ui-monospace,"SF Mono",Consolas,monospace' }}>
        {rows.map(({ label, value, badge, color: c }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ color: '#475569', flexShrink: 0, marginRight: 4 }}>{label}</span>
            {badge ? (
              <span style={{ background: (c || '#94a3b8') + '1a', color: c || '#94a3b8', border: `1px solid ${(c || '#94a3b8')}33`, borderRadius: 3, padding: '0 5px', fontSize: 9, fontWeight: 700, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            ) : (
              <span style={{ color: '#64748b', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ModelReportTexturesTab({ textures }) {
  if (!textures.length) return <div style={{ color: '#475569', fontSize: 11, padding: 16 }}>No textures found.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, padding: 12 }}>
      {textures.map(t => <TextureCard key={t.id} t={t} />)}
    </div>
  )
}
