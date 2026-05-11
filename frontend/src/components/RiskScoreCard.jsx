export default function RiskScoreCard({ score, level, recommendedAction }) {
  const levelConfig = {
    low: {
      bgColor:      'bg-green-50',
      borderColor:  'border-green-200',
      textColor:    'text-green-900',
      mutedColor:   'text-green-700',
      badgeBg:      'bg-green-100',
      badgeText:    'text-green-800',
      ringColor:    '#16a34a',   // green-600
      trackColor:   '#dcfce7',  // green-100
    },
    medium: {
      bgColor:      'bg-amber-50',
      borderColor:  'border-amber-200',
      textColor:    'text-amber-900',
      mutedColor:   'text-amber-700',
      badgeBg:      'bg-amber-100',
      badgeText:    'text-amber-800',
      ringColor:    '#d97706',
      trackColor:   '#fef3c7',
    },
    high: {
      bgColor:      'bg-red-50',
      borderColor:  'border-red-200',
      textColor:    'text-red-900',
      mutedColor:   'text-red-700',
      badgeBg:      'bg-red-100',
      badgeText:    'text-red-800',
      ringColor:    '#dc2626',
      trackColor:   '#fee2e2',
    },
  }

  const key    = (level || 'low').toLowerCase()
  const cfg    = levelConfig[key] || levelConfig.low
  const pct    = Math.min(score || 0, 100)
  const radius = 40
  const circ   = 2 * Math.PI * radius
  const offset = circ * (1 - pct / 100)

  return (
    <div className={`${cfg.bgColor} border ${cfg.borderColor} rounded-lg p-6`}>
      <div className="flex items-start justify-between gap-6">
        {/* Left: label + recommended action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <h3 className={`text-lg font-semibold ${cfg.textColor}`}>Risk Assessment</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
              {(level || '').toUpperCase()}
            </span>
          </div>

          {/* Score scale bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={cfg.mutedColor}>0 — Low</span>
              <span className={cfg.mutedColor}>31 — Medium</span>
              <span className={cfg.mutedColor}>66 — High</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: cfg.ringColor,
                }}
              />
            </div>
            <p className={`mt-1 text-xs ${cfg.mutedColor}`}>Score: {score}/100</p>
          </div>

          {recommendedAction && (
            <div className="mt-4">
              <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.mutedColor}`}>
                Recommended Action
              </p>
              <p className={`mt-1 text-sm ${cfg.mutedColor} leading-relaxed`}>
                {recommendedAction}
              </p>
            </div>
          )}
        </div>

        {/* Right: circular gauge */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              {/* Track */}
              <circle
                cx="48" cy="48" r={radius}
                fill="transparent"
                stroke={cfg.trackColor}
                strokeWidth="8"
              />
              {/* Progress */}
              <circle
                cx="48" cy="48" r={radius}
                fill="transparent"
                stroke={cfg.ringColor}
                strokeWidth="8"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.7s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${cfg.textColor}`}>{score}</span>
              <span className={`text-xs ${cfg.mutedColor}`}>/ 100</span>
            </div>
          </div>
          <p className={`mt-2 text-xs font-medium ${cfg.mutedColor}`}>Risk Score</p>
        </div>
      </div>
    </div>
  )
}
