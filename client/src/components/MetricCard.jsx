/**
 * MetricCard — shows one metric with:
 *   - icon + accent colour
 *   - brief description of what the metric means
 *   - primary value (big)
 *   - secondary value / sub-label
 *   - optional "View details" button that opens a modal
 */
export default function MetricCard({
  icon: Icon,
  accent = 'brand',
  label,
  description,   // one-line plain-English explanation
  value,         // primary big number / text
  sub,           // secondary line below value
  onClick        // if provided, shows "View details →" and makes card clickable
}) {
  const palette = {
    brand:  { bg: 'rgba(79,70,229,0.12)',  border: 'rgba(99,102,241,0.25)',  icon: '#818cf8', dot: '#6366f1' },
    purple: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', icon: '#a78bfa', dot: '#8b5cf6' },
    yellow: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: '#fbbf24', dot: '#f59e0b' },
    red:    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  icon: '#f87171', dot: '#ef4444' },
    green:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', icon: '#34d399', dot: '#10b981' },
    cyan:   { bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  icon: '#22d3ee', dot: '#06b6d4' },
    orange: { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', icon: '#fb923c', dot: '#f97316' },
    pink:   { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', icon: '#f472b6', dot: '#ec4899' },
  };

  const p = palette[accent] || palette.brand;

  return (
    <div
      onClick={onClick}
      style={{ borderColor: p.border }}
      className={[
        'relative flex flex-col gap-3 rounded-2xl p-4 border bg-gray-900',
        'transition-all duration-150',
        onClick ? 'cursor-pointer hover:brightness-110 active:scale-[0.98]' : ''
      ].join(' ')}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-2.5">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{ background: p.bg }}
        >
          {Icon && <Icon size={16} style={{ color: p.icon }} />}
        </div>
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>

      {/* Primary value */}
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value ?? '—'}</p>
        {sub && (
          <p className="text-xs text-gray-500 mt-1 leading-snug">{sub}</p>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-2.5">
        {description}
      </p>

      {/* View details link */}
      {onClick && (
        <span
          className="text-xs font-medium mt-auto"
          style={{ color: p.icon }}
        >
          View details →
        </span>
      )}
    </div>
  );
}
