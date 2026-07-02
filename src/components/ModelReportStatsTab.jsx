import { useState } from 'react'
import { fmtMB, fmtNum, fmtKB } from './ModelReportPanel'

function memColor(mb) { return mb > 512 ? '#f87171' : mb > 128 ? '#fbbf24' : '#4ade80' }

function SectionTitle({ title }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.02em', marginBottom: 10, marginTop: 4, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>{title}</div>
}

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>{title}</span>
        <span style={{ fontSize: 10, color: '#475569', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: 2 }}>▶</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

const TH = { padding: '4px 8px 4px 0', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }
const TD = { padding: '5px 8px 5px 0', fontSize: 11, color: '#cbd5e1', verticalAlign: 'top', borderBottom: '1px solid rgba(255,255,255,0.04)' }
const TD0 = { ...TD, color: '#475569', width: 24, flexShrink: 0 }

function DataTable({ headers, rows }) {
  if (!rows.length) return <div style={{ color: '#475569', fontSize: 11, padding: '4px 0 8px' }}>No data</div>
  return (
    <div style={{ overflowX: 'auto', marginBottom: 4, width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={ci === 0 ? TD0 : TD}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const trunc = (text, maxW = 80) => (
  <span style={{ maxWidth: maxW, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }} title={text}>{text}</span>
)

export default function ModelReportStatsTab({ report }) {
  const { metadata, general, scenes, meshes, geometry, gpuMemory, textures, materials, extensions, boundingBox } = report
  return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'ui-monospace,"SF Mono",Consolas,monospace' }}>

      <Section title="Metadata">
        <SectionTitle title="Overview" />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', marginBottom: 14 }}>
          {[['VERSION', metadata.version], ['GENERATOR', metadata.generator]].map(([k, v]) => (
            v ? [<span key={k+'k'} style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, alignSelf: 'start', paddingTop: 1 }}>{k}</span>, <span key={k+'v'} style={{ fontSize: 12, color: '#94a3b8' }}>{v}</span>] : null
          ))}
          {metadata.extensions.length > 0 && [
            <span key="ek" style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, alignSelf: 'start', paddingTop: 1 }}>EXTENSIONS</span>,
            <div key="ev" style={{ fontSize: 12, color: '#93c5fd' }}>{metadata.extensions.map((e, i) => <div key={i}>{e}</div>)}</div>,
          ]}
        </div>
        <SectionTitle title="XMP" />
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 14 }}>No XMP metadata.</div>
      </Section>

      {scenes.length > 0 && (
        <Section title="Scenes">
          <DataTable
            headers={['ID', 'NAME', 'ROOT_NAME', 'BBOX_MIN', 'BBOX_MAX', 'RENDER_VERTEX_COUNT', 'UPLOAD_VERTEX_COUNT', 'UPLOAD_NAIVE_VERTEX_COUNT']}
            rows={scenes.map(s => [s.id, s.name, s.rootName, s.bboxMin, s.bboxMax, fmtNum(s.renderVertexCount), fmtNum(s.uploadVertexCount), fmtNum(s.uploadNaiveVertexCount)])}
          />
        </Section>
      )}

      {meshes.length > 0 && (
        <Section title="Meshes">
          <DataTable
            headers={['ID', 'NAME', 'MODE', 'PRIMITIVES', 'GL_PRIMS', 'VERTICES', 'INDICES', 'ATTRIBUTES', 'SIZE']}
            rows={meshes.map(m => [
              m.id, trunc(m.name), m.mode, m.meshPrimitives, fmtNum(m.glPrimitives), fmtNum(m.vertices), m.indices,
              <span style={{ fontSize: 10, color: '#94a3b8', maxWidth: 120, display: 'block', lineHeight: 1.6 }}>{m.attributes.split(', ').map((a, i) => <span key={i} style={{ display: 'block' }}>{a}</span>)}</span>,
              <span style={{ color: '#64748b' }}>{m.size}</span>,
            ])}
          />
        </Section>
      )}

      <Section title="Materials">
        <DataTable
          headers={['ID', 'NAME', 'INSTANCES', 'TEXTURES', 'ALPHA_MODE', 'DOUBLE_SIDED']}
          rows={materials.map(m => [
            m.id, trunc(m.name),
            m.instances,
            <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.7, display: 'block' }}>{m.textures.length > 0 ? m.textures.map((t, i) => <span key={i} style={{ display: 'block' }}>{t}</span>) : <span style={{ color: '#475569' }}>—</span>}</span>,
            <span style={{ color: m.alphaMode === 'BLEND' ? '#fbbf24' : m.alphaMode === 'MASK' ? '#fb923c' : '#94a3b8', fontWeight: 600 }}>{m.alphaMode}</span>,
            m.doubleSided ? <span style={{ color: '#4ade80' }}>✓</span> : '',
          ])}
        />
      </Section>

      <Section title="Textures">
        <DataTable
          headers={['ID', 'NAME', 'SLOTS', 'INSTANCES', 'MIME', 'COMPRESSION', 'RESOLUTION', 'SIZE', 'GPU_SIZE']}
          rows={textures.map(t => [
            t.id, trunc(t.name, 100),
            <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.7 }}>{t.slots.length > 0 ? t.slots.map((s, i) => <span key={i} style={{ display: 'block' }}>{s}</span>) : <span style={{ color: '#475569' }}>—</span>}</span>,
            t.instances,
            <span style={{ fontSize: 10, color: '#93c5fd' }}>{t.mimeType}</span>,
            <span style={{ fontSize: 10, color: t.compression !== 'None' ? '#4ade80' : '#f87171', fontWeight: 600 }}>{t.compression}</span>,
            <span style={{ fontSize: 10, color: t.width && t.height ? (t.width > 4096 || t.height > 4096 ? '#f87171' : t.width > 2048 || t.height > 2048 ? '#fbbf24' : '#4ade80') : '#64748b' }}>{t.width && t.height ? `${t.width}x${t.height}` : '—'}</span>,
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmtKB(t.fileSizeKB)}</span>,
            <span style={{ fontSize: 10, color: memColor(t.estimatedMemoryMB) }}>{t.estimatedMemoryMB > 0 ? fmtMB(t.estimatedMemoryMB) : '—'}</span>,
          ])}
        />
      </Section>

    </div>
  )
}
