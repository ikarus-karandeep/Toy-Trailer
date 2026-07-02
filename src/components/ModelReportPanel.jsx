import { useState, useRef, useEffect } from 'react'
import ModelReportStatsTab from './ModelReportStatsTab'
import ModelReportTexturesTab from './ModelReportTexturesTab'

export function fmtMB(mb) {
  if (mb < 0.01) return '< 0.01 MB'
  if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`
  return `${mb.toFixed(2)} MB`
}
export function fmtNum(n) { return n.toLocaleString() }
export function fmtKB(kb) {
  if (kb <= 0) return '—'
  if (kb > 1024) return `${(kb / 1024).toFixed(2)} MB`
  if (kb < 1) return `${(kb * 1024).toFixed(0)} B`
  return `${kb.toFixed(2)} KB`
}

function memColor(mb) {
  if (mb > 512) return '#f87171'
  if (mb > 128) return '#fbbf24'
  return '#4ade80'
}
function dcColor(n) {
  if (n > 100) return '#f87171'
  if (n > 50) return '#fbbf24'
  return '#4ade80'
}

function StatLine({ label, value, color, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ color: '#475569', fontSize: 11, minWidth: 40 }}>{label}</span>
      <span style={{ color: color || '#e2e8f0', fontSize: 12, fontWeight: 600 }}>
        {value}
        {note && <sup style={{ fontSize: 8, color: '#64748b', marginLeft: 1 }}>{note}</sup>}
      </span>
    </div>
  )
}

export default function ModelReportPanel({ report, onClose }) {
  const { general, geometry, gpuMemory, textures } = report
  const hasUncompressed = textures.some(t => !t.compression || t.compression === 'None')

  const [tab, setTab] = useState('stats')
  const [pos, setPos] = useState({ x: 20, y: 20 })
  const [panelWidth, setPanelWidth] = useState(680)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizing = useRef(false)
  const resizeStart = useRef({ mouseX: 0, startWidth: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
      if (resizing.current) setPanelWidth(Math.max(340, resizeStart.current.startWidth + (e.clientX - resizeStart.current.mouseX)))
    }
    const onUp = () => { dragging.current = false; resizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const S = (v) => ({ fontFamily: 'ui-monospace,"SF Mono",Consolas,monospace', ...v })

  return (
    <div style={S({
      position: 'fixed', top: pos.y, left: pos.x, width: panelWidth,
      height: '90vh', maxHeight: '90vh',
      background: 'rgba(8,10,16,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, zIndex: 9999,
      display: 'flex', flexDirection: 'column', color: '#e2e8f0',
      overflowY: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    })}>
      {/* Header */}
      <div
        onMouseDown={e => {
          if (e.target.closest('button')) return
          dragging.current = true
          dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
          e.preventDefault()
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, gap: 8, cursor: 'grab', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.02em', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>GLTF Report</span>
          <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
            {general.fileName || 'trailer.glb'}{general.fileSizeMB > 0 ? ` · ${fmtMB(general.fileSizeMB)}` : ''}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>×</button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 54 }}>stats</div>
        <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <StatLine label="disk" value={general.fileSizeMB > 0 ? fmtMB(general.fileSizeMB) : 'N/A'} />
          <StatLine label="vram" value={fmtMB(gpuMemory.totalEstimatedGpuMemoryMB)} color={memColor(gpuMemory.totalEstimatedGpuMemoryMB)} note={hasUncompressed ? '¹' : undefined} />
          <StatLine label="draws" value={String(geometry.totalDrawCalls)} color={dcColor(geometry.totalDrawCalls)} />
          {hasUncompressed && <div style={{ color: '#475569', fontSize: 9, marginTop: 2 }}>¹ uncompressed</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {['stats', 'textures'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent', color: tab === t ? '#f1f5f9' : '#475569', cursor: 'pointer', padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'ui-monospace,"SF Mono",Consolas,monospace' }}>
            {t === 'textures' ? `Textures (${textures.length})` : 'Stats'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {tab === 'textures' ? <ModelReportTexturesTab textures={textures} /> : <ModelReportStatsTab report={report} />}
      </div>

      {/* Resize handle */}
      <div onMouseDown={e => { resizing.current = true; resizeStart.current = { mouseX: e.clientX, startWidth: panelWidth }; e.preventDefault(); e.stopPropagation() }} style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', zIndex: 10 }} />
    </div>
  )
}
