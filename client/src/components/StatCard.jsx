export default function StatCard({ label, value, sub, icon: Icon, accent = 'brand', onClick }) {
  const accents = {
    brand:  { bg: 'bg-brand-600/15',  text: 'text-brand-400',  ring: 'ring-brand-500/30' },
    green:  { bg: 'bg-green-600/15',  text: 'text-green-400',  ring: 'ring-green-500/30' },
    yellow: { bg: 'bg-yellow-600/15', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
    red:    { bg: 'bg-red-600/15',    text: 'text-red-400',    ring: 'ring-red-500/30' },
    purple: { bg: 'bg-purple-600/15', text: 'text-purple-400', ring: 'ring-purple-500/30' },
    cyan:   { bg: 'bg-cyan-600/15',   text: 'text-cyan-400',   ring: 'ring-cyan-500/30' }
  };

  const a = accents[accent] || accents.brand;

  return (
    <div
      className={`card-sm flex items-start gap-4 ${onClick ? 'cursor-pointer hover:border-gray-700 transition-colors' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <div className={`p-2.5 rounded-xl ${a.bg} ring-1 ${a.ring} shrink-0`}>
          <Icon className={`w-5 h-5 ${a.text}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="stat-label mb-1">{label}</p>
        <p className="stat-value truncate">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
