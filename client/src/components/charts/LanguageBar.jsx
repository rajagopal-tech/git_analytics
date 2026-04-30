/**
 * Feature 5: Full-repo language breakdown with % bars
 * Uses languageBreakdown (from git ls-files) when available,
 * falls back to languagesUsed list.
 */
const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
];

export default function LanguageBar({ languagesUsed, languageBreakdown }) {
  // Prefer full breakdown if available
  const hasBreakdown = languageBreakdown?.length > 0;

  if (!hasBreakdown && !languagesUsed?.length) {
    return <p className="text-gray-600 text-sm text-center py-4">No language data</p>;
  }

  if (hasBreakdown) {
    const top = languageBreakdown.slice(0, 10);
    const total = top.reduce((s, l) => s + l.count, 0);

    return (
      <div className="space-y-2">
        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {top.map((l, i) => (
            <div
              key={l.lang}
              style={{ width: l.pct, backgroundColor: COLORS[i % COLORS.length] }}
              title={`${l.lang}: ${l.pct}`}
            />
          ))}
        </div>

        {/* Legend with % */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
          {top.map((l, i) => (
            <div key={l.lang} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-gray-400">{l.lang}</span>
              <span className="text-xs text-gray-600">{l.pct}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: simple tag list
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {languagesUsed.map((lang, i) => (
        <span
          key={lang}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 border border-gray-700"
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          {lang}
        </span>
      ))}
    </div>
  );
}
