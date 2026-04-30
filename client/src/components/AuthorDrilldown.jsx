/**
 * Feature 4: Per-author drill-down + team health score
 */
import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import RiskBadge from './RiskBadge';

function HealthBar({ score }) {
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold w-12 text-right" style={{ color }}>{score}/100</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function AuthorRow({ author }) {
  const [open, setOpen] = useState(false);

  const burnoutRisk =
    parseInt(author.lateNightPct) > 30 || parseInt(author.weekendPct) > 30 ? 'High' :
    parseInt(author.lateNightPct) > 15 || parseInt(author.weekendPct) > 15 ? 'Medium' : 'Low';

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-gray-900 hover:bg-gray-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
            {author.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{author.name}</p>
            <p className="text-xs text-gray-500">{author.totalCommits} commits · {author.activeDays} active days</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RiskBadge risk={burnoutRisk} />
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Late Night', value: author.lateNightPct, color: '#a78bfa' },
            { label: 'Weekend',    value: author.weekendPct,   color: '#fbbf24' },
            { label: 'Churn',      value: author.churnPct,     color: '#f87171' },
            { label: 'Conventional', value: author.conventionalPct, color: '#34d399' },
            { label: 'Large Commits', value: author.largeCommits, color: '#fb923c' },
            { label: 'Insertions', value: author.insertions?.toLocaleString(), color: '#22d3ee' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
              <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 bg-gray-800 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">Active period</p>
            <p className="text-xs text-gray-300 font-mono">{author.firstCommit} → {author.lastCommit}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthorDrilldown({ authorMetrics, healthScore }) {
  const [show, setShow] = useState(false);

  if (!authorMetrics?.length) return null;

  return (
    <div className="space-y-3">
      {/* Team health score */}
      <div className="card-sm">
        <div className="flex items-center gap-2 mb-3">
          <Heart size={14} style={{ color: '#f472b6' }} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Health Score</p>
        </div>
        <HealthBar score={healthScore ?? 0} />
        <p className="text-xs text-gray-600 mt-2">
          Composite score based on late-night work, weekend commits, churn rate, commit quality, and large commit frequency.
        </p>
      </div>

      {/* Author list */}
      <div>
        <button
          onClick={() => setShow(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-200 transition-colors"
        >
          <Users size={13} />
          {authorMetrics.length} Authors
          {show ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {show && (
          <div className="space-y-2">
            {authorMetrics.map(author => (
              <AuthorRow key={author.name} author={author} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
