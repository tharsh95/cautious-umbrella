export default function FindingsCard({ findings }) {
  const severityConfig = {
    high: {
      bgColor:     'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor:  'bg-red-100 text-red-700',
      iconColor:   'text-red-500',
    },
    medium: {
      bgColor:     'bg-amber-50',
      borderColor: 'border-amber-200',
      badgeColor:  'bg-amber-100 text-amber-700',
      iconColor:   'text-amber-500',
    },
    low: {
      bgColor:     'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor:  'bg-blue-100 text-blue-700',
      iconColor:   'text-blue-500',
    },
  }

  if (!findings || findings.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-base font-semibold text-green-900">No Findings</h3>
            <p className="text-sm text-green-700 mt-0.5">
              No metadata anomalies were detected. The document's metadata appears consistent and complete.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const high   = findings.filter(f => f.severity.toLowerCase() === 'high').length
  const medium = findings.filter(f => f.severity.toLowerCase() === 'medium').length
  const low    = findings.filter(f => f.severity.toLowerCase() === 'low').length

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Findings <span className="text-gray-500 font-normal">({findings.length})</span>
          </h3>
          <div className="flex items-center space-x-2">
            {high > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {high} High
              </span>
            )}
            {medium > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {medium} Medium
              </span>
            )}
            {low > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {low} Low
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {findings.map((finding, index) => {
          const key    = (finding.severity || 'low').toLowerCase()
          const config = severityConfig[key] || severityConfig.low

          return (
            <div key={index} className="p-6">
              <div className="flex items-start justify-between gap-4">
                {/* Icon + content */}
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <svg
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{finding.explanation}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end space-y-1.5 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold ${config.badgeColor}`}>
                    {finding.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {Math.round(finding.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
