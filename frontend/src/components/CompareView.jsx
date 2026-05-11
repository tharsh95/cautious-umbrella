import { useState } from 'react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS = {
  file_name:       'File Name',
  file_size_bytes: 'File Size',
  file_type:       'File Type',
  pdf_version:     'PDF Version',
  created_date:    'Created Date',
  modified_date:   'Modified Date',
  author:          'Author',
  creator:         'Creator',
  producer:        'Producer',
  title:           'Title',
  subject:         'Subject',
  page_count:      'Page Count',
  is_encrypted:    'Encrypted',
}

function fmt(key, value) {
  if (value === null || value === undefined || value === '') return null
  if (key === 'file_size_bytes') return `${(value / 1024).toFixed(1)} KB`
  if (key === 'is_encrypted') return value ? 'Yes' : 'No'
  return String(value)
}

// Classify each field across two metadata objects
function buildDiff(metaA, metaB) {
  const allKeys = Array.from(
    new Set([...Object.keys(metaA), ...Object.keys(metaB)])
  ).filter(k => k !== 'extra')

  return allKeys.map(key => {
    const a = fmt(key, metaA[key])
    const b = fmt(key, metaB[key])
    let status = 'same'
    if (a === null && b === null) status = 'both_missing'
    else if (a === null && b !== null) status = 'only_b'
    else if (a !== null && b === null) status = 'only_a'
    else if (a !== b) status = 'different'
    return { key, label: FIELD_LABELS[key] || key.replace(/_/g, ' '), a, b, status }
  })
}

// ---------------------------------------------------------------------------
// Single file uploader panel
// ---------------------------------------------------------------------------
function FileSlot({ label, report, loading, error, onUpload, onClear }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onUpload(f)
  }

  const riskColor = {
    Low:    { bg: 'bg-green-50',  border: 'border-green-300', text: 'text-green-700',  badge: 'bg-green-100 text-green-700'  },
    Medium: { bg: 'bg-amber-50',  border: 'border-amber-300', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700'  },
    High:   { bg: 'bg-red-50',    border: 'border-red-300',   text: 'text-red-700',    badge: 'bg-red-100 text-red-700'      },
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white border-2 border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        <p className="text-sm text-gray-500">Analyzing…</p>
      </div>
    )
  }

  if (report) {
    const lvl = report.metadata_risk_level
    const c   = riskColor[lvl] || riskColor.Low
    return (
      <div className={`flex-1 ${c.bg} border-2 ${c.border} rounded-xl p-5 space-y-3`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5 break-all">{report.document_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{report.file_type}</p>
          </div>
          <button onClick={onClear} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${c.text}`}>{report.metadata_risk_score}</div>
          <div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.badge}`}>{lvl} Risk</span>
            <p className="text-xs text-gray-500 mt-0.5">{report.findings.length} finding{report.findings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{report.summary}</p>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-14 px-6 text-center cursor-pointer">
        <input type="file" className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png,.tiff,.bmp"
          onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <p className="text-xs text-gray-400 mt-1">Drop file or click to browse</p>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </label>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status icon helper
// ---------------------------------------------------------------------------
function DiffBadge({ status }) {
  if (status === 'same')         return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Match</span>
  if (status === 'both_missing') return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Both absent</span>
  if (status === 'different')    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Different</span>
  if (status === 'only_a')       return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Doc A only</span>
  if (status === 'only_b')       return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Doc B only</span>
  return null
}

// ---------------------------------------------------------------------------
// Main CompareView
// ---------------------------------------------------------------------------
export default function CompareView() {
  const [stateA, setStateA] = useState({ report: null, loading: false, error: null })
  const [stateB, setStateB] = useState({ report: null, loading: false, error: null })
  const [filter, setFilter] = useState('all')  // 'all' | 'different' | 'same'

  const analyze = async (file, setState) => {
    setState({ report: null, loading: true, error: null })
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Analysis failed')
      }
      const data = await res.json()
      setState({ report: data, loading: false, error: null })
    } catch (err) {
      setState({ report: null, loading: false, error: err.message })
    }
  }

  const bothReady = stateA.report && stateB.report

  const diffRows = bothReady
    ? buildDiff(stateA.report.extracted_metadata, stateB.report.extracted_metadata)
    : []

  const filtered = filter === 'all'       ? diffRows
    : filter === 'different' ? diffRows.filter(r => r.status === 'different' || r.status === 'only_a' || r.status === 'only_b')
    : diffRows.filter(r => r.status === 'same')

  const diffCount  = diffRows.filter(r => r.status !== 'same' && r.status !== 'both_missing').length
  const matchCount = diffRows.filter(r => r.status === 'same').length

  const rowBg = {
    same:         'bg-white',
    both_missing: 'bg-gray-50',
    different:    'bg-amber-50',
    only_a:       'bg-orange-50',
    only_b:       'bg-orange-50',
  }

  return (
    <div className="space-y-6">
      {/* ── Upload slots ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-col sm:flex-row">
        <FileSlot
          label="Document A"
          report={stateA.report}
          loading={stateA.loading}
          error={stateA.error}
          onUpload={f => analyze(f, setStateA)}
          onClear={() => setStateA({ report: null, loading: false, error: null })}
        />

        {/* Divider */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col sm:flex-row items-center gap-1 text-gray-300">
            <div className="hidden sm:block w-px h-20 bg-gray-200" />
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <div className="hidden sm:block w-px h-20 bg-gray-200" />
          </div>
        </div>

        <FileSlot
          label="Document B"
          report={stateB.report}
          loading={stateB.loading}
          error={stateB.error}
          onUpload={f => analyze(f, setStateB)}
          onClear={() => setStateB({ report: null, loading: false, error: null })}
        />
      </div>

      {/* ── Prompt when not both ready ────────────────────────────────── */}
      {!bothReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
          Upload both documents above to see a side-by-side metadata comparison.
        </div>
      )}

      {/* ── Comparison table ──────────────────────────────────────────── */}
      {bothReady && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header bar */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Metadata Comparison</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="text-amber-600 font-semibold">{diffCount} difference{diffCount !== 1 ? 's' : ''}</span>
                {' · '}
                <span className="text-green-600 font-semibold">{matchCount} matching</span>
                {' field'}
                {matchCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 self-start sm:self-auto">
              {[['all', 'All'], ['different', 'Differences'], ['same', 'Matches']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    filter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[160px_1fr_1fr_90px] bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="px-4 py-2.5">Field</div>
            <div className="px-4 py-2.5 border-l border-gray-200">
              {stateA.report.document_name.length > 22
                ? stateA.report.document_name.slice(0, 20) + '…'
                : stateA.report.document_name}
            </div>
            <div className="px-4 py-2.5 border-l border-gray-200">
              {stateB.report.document_name.length > 22
                ? stateB.report.document_name.slice(0, 20) + '…'
                : stateB.report.document_name}
            </div>
            <div className="px-4 py-2.5 border-l border-gray-200">Status</div>
          </div>

          {/* Diff rows */}
          <div className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No fields match this filter.</p>
            )}
            {filtered.map(({ key, label, a, b, status }) => (
              <div key={key}
                className={`grid grid-cols-[160px_1fr_1fr_90px] text-sm ${rowBg[status]}`}>
                <div className="px-4 py-3 font-medium text-gray-600 capitalize text-xs">{label}</div>
                <div className={`px-4 py-3 border-l border-gray-100 break-all text-xs ${
                  status === 'only_b' ? 'text-gray-300' : 'text-gray-800'
                }`}>
                  {a ?? <span className="text-gray-300 italic">—</span>}
                </div>
                <div className={`px-4 py-3 border-l border-gray-100 break-all text-xs ${
                  status === 'only_a' ? 'text-gray-300' : 'text-gray-800'
                }`}>
                  {b ?? <span className="text-gray-300 italic">—</span>}
                </div>
                <div className="px-4 py-3 border-l border-gray-100 flex items-start pt-3">
                  <DiffBadge status={status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Risk score comparison ─────────────────────────────────────── */}
      {bothReady && (
        <RiskComparison a={stateA.report} b={stateB.report} />
      )}

      {/* ── Findings comparison ───────────────────────────────────────── */}
      {bothReady && (
        <FindingsComparison a={stateA.report} b={stateB.report} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Risk score side-by-side
// ---------------------------------------------------------------------------
function RiskComparison({ a, b }) {
  const cfg = {
    Low:    { ring: '#16a34a', track: '#dcfce7', text: 'text-green-700', badge: 'bg-green-100 text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    Medium: { ring: '#d97706', track: '#fef3c7', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    High:   { ring: '#dc2626', track: '#fee2e2', text: 'text-red-700',   badge: 'bg-red-100 text-red-700',   bg: 'bg-red-50',   border: 'border-red-200'   },
  }

  const Gauge = ({ report }) => {
    const c   = cfg[report.metadata_risk_level] || cfg.Low
    const pct = report.metadata_risk_score
    const r   = 36
    const circ = 2 * Math.PI * r
    return (
      <div className={`flex-1 ${c.bg} border ${c.border} rounded-xl p-5 flex items-center gap-4`}>
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="transparent" stroke={c.track} strokeWidth="7" />
            <circle cx="40" cy="40" r={r} fill="transparent" stroke={c.ring} strokeWidth="7"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${c.text}`}>{pct}</span>
            <span className={`text-xs ${c.text} opacity-70`}>/100</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium truncate max-w-[140px]">{report.document_name}</p>
          <span className={`mt-1 inline-block px-2.5 py-1 rounded-full text-xs font-bold ${c.badge}`}>
            {report.metadata_risk_level} Risk
          </span>
          <p className="text-xs text-gray-500 mt-1">{report.findings.length} finding{report.findings.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    )
  }

  const scoreDiff = Math.abs(a.metadata_risk_score - b.metadata_risk_score)

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Risk Score Comparison</h3>
      <div className="flex gap-4 flex-col sm:flex-row">
        <Gauge report={a} />
        <div className="flex items-center justify-center">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            scoreDiff === 0 ? 'bg-green-100 text-green-700' :
            scoreDiff <= 15 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {scoreDiff === 0 ? 'Equal' : `Δ ${scoreDiff} pts`}
          </div>
        </div>
        <Gauge report={b} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Findings comparison — unique findings per document
// ---------------------------------------------------------------------------
function FindingsComparison({ a, b }) {
  const titlesA = new Set(a.findings.map(f => f.title))
  const titlesB = new Set(b.findings.map(f => f.title))

  const onlyA = a.findings.filter(f => !titlesB.has(f.title))
  const onlyB = b.findings.filter(f => !titlesA.has(f.title))
  const shared = a.findings.filter(f => titlesB.has(f.title))

  const sevCls = {
    High:   'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low:    'bg-blue-100 text-blue-700',
  }

  const FindingPill = ({ f }) => (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-700">{f.title}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${sevCls[f.severity] || sevCls.Low}`}>
        {f.severity}
      </span>
    </div>
  )

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Findings Comparison</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Only in A */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">
            Only in A ({onlyA.length})
          </p>
          {onlyA.length === 0
            ? <p className="text-xs text-gray-400">None</p>
            : onlyA.map((f, i) => <FindingPill key={i} f={f} />)
          }
        </div>

        {/* Shared */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Shared ({shared.length})
          </p>
          {shared.length === 0
            ? <p className="text-xs text-gray-400">None</p>
            : shared.map((f, i) => <FindingPill key={i} f={f} />)
          }
        </div>

        {/* Only in B */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">
            Only in B ({onlyB.length})
          </p>
          {onlyB.length === 0
            ? <p className="text-xs text-gray-400">None</p>
            : onlyB.map((f, i) => <FindingPill key={i} f={f} />)
          }
        </div>
      </div>
    </div>
  )
}
