/**
 * Feature 2: Comparison view
 * Select 2+ cached repos and see metrics side-by-side with diff highlights.
 */
import { useState } from 'react';
import { GitCompare, Loader2, AlertCircle, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCompare } from '../hooks/useAnalysis';

const METRICS = [
  { key: 'totalCommits',    label: 'Total Commits',    higher: 'better',  fmt: v => Number(v).toLocaleString() },
  { key: 'healthScore',     label: 'Health Score',     higher: 'better',  fmt: v => `${v}/100` },
  { key: 'burnoutRisk',     label: 'Burnout Risk',     higher: 'worse',   fmt: v => v },
  { key: 'lateNightPct',    label: 'Late Night %',     higher: 'worse',   fmt: v => v },
  { key: 'weekendPct',      label: 'Weekend %',        higher: 'worse',   fmt: v => v },
  { key: 'churnRate',       label: 'Churn Rate',       higher: 'worse',   fmt: v => v },
  { key: 'conventionalPct', label: 'Conventional %',   higher: 'better',  fmt: v => v },
  { key: 'largeCommits',    label: 'Large Commits',    higher: 'worse',   fmt: v => v },
  { key: 'languageCount',   label: 'Languages',        higher: 'neutral', fmt: v => v },
  { key: 'authorCount',     label: 'Authors',          higher: 'neutral', fmt: v => v },
  { key: 'mostActiveDay',   label: 'Most Active Day',  higher: 'neutral', fmt: v => v },
];

function parseNum(v) {
  if (v === undefined || v === null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

function DiffIcon({ val, best, metric }) {
  if (metric.higher === 'neutral') return <Minus size={12} className="text-gray-600" />;
  const n = parseNum(val);
  const b = parseNum(best);
  if (n === null || b === null) return null;
  const isBest = Math.abs(n - b) < 0.001;
  if (isBest) return <TrendingUp size={12} className="text-green-400" />;
  return <TrendingDown size={12} className="text-red-400" />;
}

export default function CompareView({ cachedRepos }) {
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const { mutate: compare, isPending, error } = useCompare();

  const toggle = (name) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
    setResult(null);
  };

  const runCompare = () => {
    compare(selected, {
      onSuccess: (data) => setResult(data.comparison),
      onError: () => {}
    });
  };

  if (!cachedRepos?.length) return null;

  // Find best value per metric
  const getBest = (metricKey) => {
    if (!result) return null;
    const vals = result.map(r => parseNum(r[metricKey])).filter(v => v !== null);
    if (!vals.length) return null;
    const m = METRICS.find(m => m.key === metricKey);
    return m?.higher === 'better' ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(6,182,212,0.12)' }}>
          <GitCompare size={16} style={{ color: '#22d3ee' }} />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Compare Repositories</p>
          <p className="text-xs text-gray-500">Select 2 or more cached repos to compare side-by-side</p>
        </div>
      </div>

      {/* Repo selector */}
      <div className="flex flex-wrap gap-2">
        {cachedRepos.map(r => (
          <button
            key={r.repoName}
            onClick={() => toggle(r.repoName)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              selected.includes(r.repoName)
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            ].join(' ')}
          >
            {r.repoName}
          </button>
        ))}
      </div>

      {selected.length >= 2 && (
        <button
          onClick={runCompare}
          disabled={isPending}
          className="btn-primary text-sm"
        >
          {isPending ? <><Loader2 size={14} className="animate-spin" /> Comparing…</> : <><GitCompare size={14} /> Compare {selected.length} repos</>}
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} /> Failed to compare
        </div>
      )}

      {/* Comparison table */}
      {result && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium">Metric</th>
                {result.map(r => (
                  <th key={r.repoName} className="text-left text-xs pb-3 pr-4 font-semibold text-white">
                    {r.repoName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {METRICS.map(metric => {
                const best = getBest(metric.key);
                return (
                  <tr key={metric.key} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-500 text-xs font-medium">{metric.label}</td>
                    {result.map(r => {
                      const val = r[metric.key];
                      const n = parseNum(val);
                      const isBest = best !== null && n !== null && Math.abs(n - best) < 0.001 && metric.higher !== 'neutral';
                      return (
                        <td key={r.repoName} className="py-2.5 pr-4">
                          <span className={[
                            'flex items-center gap-1.5 font-medium',
                            isBest && metric.higher === 'better' ? 'text-green-400' :
                            isBest && metric.higher === 'worse'  ? 'text-red-400' :
                            'text-gray-300'
                          ].join(' ')}>
                            {metric.fmt(val ?? '—')}
                            <DiffIcon val={val} best={best} metric={metric} />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
