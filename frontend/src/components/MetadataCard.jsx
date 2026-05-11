import { useState } from 'react'

const FIELD_LABELS = {
  file_name:        'File Name',
  file_size_bytes:  'File Size',
  file_type:        'File Type',
  pdf_version:      'PDF Version',
  created_date:     'Created Date',
  modified_date:    'Modified Date',
  author:           'Author',
  creator:          'Creator',
  producer:         'Producer',
  title:            'Title',
  subject:          'Subject',
  page_count:       'Page Count',
  is_encrypted:     'Encrypted',
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function renderCellValue(key, value) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic text-xs">not present</span>
  }
  if (key === 'file_size_bytes') {
    return <span className="text-gray-800">{formatBytes(value)} <span className="text-gray-400 text-xs">({value.toLocaleString()} bytes)</span></span>
  }
  if (key === 'is_encrypted') {
    return value
      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Yes</span>
      : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">No</span>
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return <span className="text-gray-800 break-all">{String(value)}</span>
}

export default function MetadataCard({ metadata }) {
  const [showRaw, setShowRaw] = useState(false)

  if (!metadata) return null

  // Separate the known flat fields from the `extra` blob
  const { extra, ...flat } = metadata

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-base font-semibold text-gray-900">Extracted Metadata</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRaw(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              !showRaw
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setShowRaw(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              showRaw
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Raw JSON
          </button>
        </div>
      </div>

      {/* Table View */}
      {!showRaw && (
        <div className="divide-y divide-gray-100">
          {Object.entries(flat).map(([key, value]) => (
            <div key={key} className="flex items-start px-6 py-3 hover:bg-gray-50 transition-colors">
              <span className="w-44 flex-shrink-0 text-sm font-medium text-gray-500">
                {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 text-sm">
                {renderCellValue(key, value)}
              </div>
            </div>
          ))}

          {/* Extra fields (EXIF, DOCX props) */}
          {extra && Object.keys(extra).length > 0 && (
            <>
              <div className="px-6 py-2 bg-gray-50">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Additional Fields
                </span>
              </div>
              {Object.entries(extra).map(([key, value]) => (
                value !== null && value !== undefined ? (
                  <div key={key} className="flex items-start px-6 py-3 hover:bg-gray-50 transition-colors">
                    <span className="w-44 flex-shrink-0 text-sm font-medium text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 text-sm text-gray-800">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ) : null
              ))}
            </>
          )}
        </div>
      )}

      {/* Raw JSON View */}
      {showRaw && (
        <div className="p-6">
          <pre className="bg-gray-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
