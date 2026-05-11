import { useState } from 'react'
import RiskScoreCard from './RiskScoreCard'
import FindingsCard from './FindingsCard'
import MetadataCard from './MetadataCard'

// ---------------------------------------------------------------------------
// Markdown generator
// ---------------------------------------------------------------------------
function buildMarkdown(report) {
  const r   = report
  const md  = r.extracted_metadata
  const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })

  const val  = (v) => (v === null || v === undefined || v === '') ? '—' : String(v)
  const bool = (v) => (v ? 'Yes' : 'No')
  const kb   = (b) => b ? `${(b / 1024).toFixed(1)} KB (${b.toLocaleString()} bytes)` : '—'
  const conf = (c) => `${Math.round(c * 100)}%`

  const severityEmoji = { High: '🔴', Medium: '🟡', Low: '🔵' }

  const findingLines = (r.findings || []).map((f, i) => {
    const icon = severityEmoji[f.severity] || '⚪'
    return [
      `### Finding ${i + 1}: ${f.title}`,
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Severity | ${icon} **${f.severity}** |`,
      `| Confidence | ${conf(f.confidence)} |`,
      '',
      `**Explanation:** ${f.explanation}`,
      '',
    ].join('\n')
  }).join('\n')

  const metaRows = [
    ['File Name',       val(md.file_name)],
    ['File Size',       kb(md.file_size_bytes)],
    ['File Type',       val(md.file_type)],
    ['PDF Version',     val(md.pdf_version)],
    ['Created Date',    val(md.created_date)],
    ['Modified Date',   val(md.modified_date)],
    ['Author',          val(md.author)],
    ['Creator',         val(md.creator)],
    ['Producer',        val(md.producer)],
    ['Title',           val(md.title)],
    ['Subject',         val(md.subject)],
    ['Page Count',      val(md.page_count)],
    ['Encrypted',       bool(md.is_encrypted)],
  ].map(([k, v]) => `| ${k} | ${v} |`).join('\n')

  const riskEmoji = { Low: '🟢', Medium: '🟡', High: '🔴' }
  const riskIcon  = riskEmoji[r.metadata_risk_level] || '⚪'

  const extraSection = md.extra && Object.keys(md.extra).length > 0
    ? [
        '',
        '### Additional Fields',
        '',
        '| Field | Value |',
        '|-------|-------|',
        ...Object.entries(md.extra)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `| ${k.replace(/_/g, ' ')} | ${typeof v === 'object' ? JSON.stringify(v) : val(v)} |`),
      ].join('\n')
    : ''

  return `# Document Metadata Analysis Report

> Generated: ${now}

---

## 1. Document Overview

| Field | Value |
|-------|-------|
| Document Name | \`${val(r.document_name)}\` |
| File Type | ${val(r.file_type)} |
| Risk Level | ${riskIcon} **${r.metadata_risk_level}** |
| Risk Score | **${r.metadata_risk_score} / 100** |

---

## 2. Summary

${r.summary}

---

## 3. Risk Assessment

**Score:** ${r.metadata_risk_score} / 100 — **${r.metadata_risk_level} Risk**

> Score ranges: 0–30 Low · 31–65 Medium · 66–100 High

**Recommended Action:**
${r.recommended_action}

---

## 4. Extracted Metadata

| Field | Value |
|-------|-------|
${metaRows}
${extraSection}

---

## 5. Findings (${(r.findings || []).length})

${(r.findings || []).length === 0
  ? '_No metadata anomalies detected._'
  : findingLines.trimEnd()
}

---

## 6. Disclaimer

This report analyses document metadata patterns only. It does not constitute
forensic evidence. Metadata anomalies frequently arise from legitimate editing
or export workflows. For high-stakes determinations, consult a qualified
digital forensics professional.

---

*Document Metadata Mutation Checker · ${now}*
`
}

// ---------------------------------------------------------------------------
// Proper line-by-line markdown → HTML converter (no regex hacks)
// ---------------------------------------------------------------------------
function markdownToHtml(md) {
  const lines  = md.split('\n')
  const out    = []
  let inTable  = false
  let inP      = false

  const inline = (t) =>
    t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g,        '<code>$1</code>')
      .replace(/\*(.+?)\*/g,      '<em>$1</em>')

  const endP     = () => { if (inP)     { out.push('</p>');     inP     = false } }
  const endTable = () => { if (inTable) { out.push('</table>'); inTable = false } }

  for (const line of lines) {
    // Headings
    if (line.startsWith('# '))   { endP(); endTable(); out.push(`<h1>${inline(line.slice(2))}</h1>`);  continue }
    if (line.startsWith('## '))  { endP(); endTable(); out.push(`<h2>${inline(line.slice(3))}</h2>`);  continue }
    if (line.startsWith('### ')) { endP(); endTable(); out.push(`<h3>${inline(line.slice(4))}</h3>`);  continue }

    // Horizontal rule
    if (line.trim() === '---') { endP(); endTable(); out.push('<hr>'); continue }

    // Blockquote
    if (line.startsWith('> ')) { endP(); endTable(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue }

    // Table rows
    if (line.startsWith('|')) {
      endP()
      // Skip separator rows like |---|---|
      if (/^\|[\s|:\-]+\|$/.test(line)) continue
      if (!inTable) { out.push('<table>'); inTable = true }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      // First column bold → treat as header-style row
      const isHeader = cells[0]?.startsWith('**') && cells[0]?.endsWith('**')
      const tag = isHeader ? 'th' : 'td'
      out.push('<tr>' + cells.map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>')
      continue
    }

    // Non-table: close open table
    if (inTable) endTable()

    // Empty line
    if (line.trim() === '') { endP(); continue }

    // Paragraph text
    if (!inP) { out.push('<p>'); inP = true } else { out.push('<br>') }
    out.push(inline(line))
  }

  endP()
  endTable()
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// Print-to-PDF: opens a styled HTML window and triggers browser print dialog
// ---------------------------------------------------------------------------
function printMarkdown(report) {
  const r         = report
  const riskColor = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626' }
  const color     = riskColor[r.metadata_risk_level] || '#374151'
  const html      = markdownToHtml(buildMarkdown(report))

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Metadata Report — ${r.document_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #1f2937;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 48px;
    }
    h1 { font-size: 22px; font-weight: 700; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { font-size: 16px; font-weight: 700; color: #1e3a5f; margin-top: 28px; margin-bottom: 10px; border-left: 4px solid ${color}; padding-left: 10px; }
    h3 { font-size: 13px; font-weight: 600; color: #374151; margin-top: 16px; margin-bottom: 6px; }
    p  { margin: 8px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    blockquote { background: #f9fafb; border-left: 3px solid #d1d5db; padding: 8px 14px; color: #6b7280; margin: 10px 0; border-radius: 4px; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 7px 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; }
    tr:nth-child(even) td { background: #f9fafb; }
    code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 12px; color: #1e40af; }
    strong { color: #111827; }
    .risk-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-weight: 700; font-size: 12px; background: ${color}22; color: ${color}; }
    @media print {
      body { padding: 20px 28px; }
      h2 { break-before: auto; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReportView({ report, onReset }) {
  const [reportOpen,  setReportOpen]  = useState(false)
  const [reportFormat, setReportFormat] = useState('json') // 'json' | 'markdown'

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${report.document_name.replace(/\.[^.]+$/, '')}-metadata-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadMarkdown = () => {
    const blob = new Blob([buildMarkdown(report)], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${report.document_name.replace(/\.[^.]+$/, '')}-metadata-report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const levelColors = { low: 'text-green-700 bg-green-100', medium: 'text-amber-700 bg-amber-100', high: 'text-red-700 bg-red-100' }
  const levelKey    = (report.metadata_risk_level || 'low').toLowerCase()
  const levelCls    = levelColors[levelKey] || levelColors.low

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis Report</h2>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span className="text-sm text-gray-600">{report.document_name}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-600">{report.file_type}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${levelCls}`}>
              {report.metadata_risk_level} Risk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button onClick={downloadJson}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download JSON
          </button>
          <button onClick={onReset}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Analyze Another
          </button>
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
        <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* ── Risk score ──────────────────────────────────────────────────── */}
      <RiskScoreCard
        score={report.metadata_risk_score}
        level={report.metadata_risk_level}
        recommendedAction={report.recommended_action}
      />

      {/* ── Findings ────────────────────────────────────────────────────── */}
      <FindingsCard findings={report.findings} />

      {/* ── Extracted metadata ──────────────────────────────────────────── */}
      <MetadataCard metadata={report.extracted_metadata} />

      {/* ── Full Report (JSON / Markdown) ───────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setReportOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">Full Report</span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${reportOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {reportOpen && (
          <div className="px-6 pb-6 pt-4 space-y-4">
            {/* Format toggle + action buttons */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* JSON / Markdown toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
                <button
                  onClick={() => setReportFormat('json')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    reportFormat === 'json'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setReportFormat('markdown')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    reportFormat === 'markdown'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Markdown
                </button>
              </div>

              {/* Action buttons — change depending on active format */}
              <div className="flex items-center gap-2">
                {reportFormat === 'json' ? (
                  <button
                    onClick={downloadJson}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                  </button>
                ) : (
                  <>
                    <button
                      onClick={downloadMarkdown}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download .md
                    </button>
                    <button
                      onClick={() => printMarkdown(report)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print / Save as PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content pane */}
            {reportFormat === 'json' ? (
              <pre className="bg-gray-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-y-auto">
                {JSON.stringify(report, null, 2)}
              </pre>
            ) : (
              <pre className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-y-auto font-mono">
                {buildMarkdown(report)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Important Notice</h4>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              This report analyses document metadata patterns only. It does not constitute
              forensic evidence. Metadata anomalies frequently arise from legitimate editing
              or export workflows. For high-stakes determinations, consult a qualified
              digital forensics professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
