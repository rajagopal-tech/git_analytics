import { useState } from 'react';
import {
  Moon, Calendar, Flame, MessageSquare, GitCommit,
  Code2, Zap, ChevronDown, ChevronUp, ExternalLink, Trash2, BarChart2, Loader2
} from 'lucide-react';
import RiskBadge from './RiskBadge';
import MetricCard from './MetricCard';
import MetricModal from './MetricModal';
import DailyActivityBar from './charts/DailyActivityBar';
import YearlyCommitsLine from './charts/YearlyCommitsLine';
import AuthorPie from './charts/AuthorPie';

export default function RepoCard({ data, repoUrl, onDelete, isDeleting }) {
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(null);

  const m = data;

  /* ── 8 metric definitions ─────────────────────────────────────────── */
  const METRICS = [
    {
      key: 'commits',
      icon: GitCommit,
      accent: 'brand',
      label: 'Total Commits',
      description: 'All non-merge commits in the repository history.',
      value: m.totalCommits?.toLocaleString(),
      sub: `Most active: ${m.timeDateActivity?.mostActiveDay}`
    },
    {
      key: 'latenight',
      icon: Moon,
      accent: 'purple',
      label: 'Late Night Work',
      description: 'Commits made between 20:00 and 04:59 — signals after-hours pressure.',
      value: m.timeDateActivity?.lateNightPercentage,
      sub: `${m.timeDateActivity?.lateNightDetails?.length} commits`
    },
    {
      key: 'weekend',
      icon: Calendar,
      accent: 'yellow',
      label: 'Weekend Work',
      description: 'Commits on Saturday or Sunday — may indicate overwork or passion projects.',
      value: m.timeDateActivity?.weekendWork,
      sub: `${m.timeDateActivity?.weekendDetails?.length} commits`
    },
    {
      key: 'churn',
      icon: Flame,
      accent: 'red',
      label: 'Churn Rate',
      description: 'Commits with fix / revert / delete / remove in the message — rework signal.',
      value: m.churnRate,
      sub: `${m.churnDetails?.length} churn commits`
    },
    {
      key: 'burnout',
      icon: Zap,
      accent: 'cyan',
      label: 'Burnout Risk',
      description: 'Longest consecutive-day commit streak. >20 days = High, >10 = Medium.',
      value: m.burnoutDetection?.burnoutRisk,
      sub: `Streak: ${m.burnoutDetection?.longestStreak} · Idle: ${m.idlePeriods?.longestIdle}`
    },
    {
      key: 'messages',
      icon: MessageSquare,
      accent: 'green',
      label: 'Commit Quality',
      description: 'Percentage following conventional format (feat/fix/docs/…): description.',
      value: m.commitMessageStructure?.meaningfulMessages,
      sub: `${m.commitMessageStructure?.commitMessageDetails?.length} messages analysed`
    },
    {
      key: 'large',
      icon: BarChart2,
      accent: 'orange',
      label: 'Large Commits',
      description: 'Commits changing >100 lines — hard to review and risky to merge.',
      value: m.largeCommits?.count,
      sub: `Biggest: ${m.largeCommits?.biggestCommitSize}`
    },
    {
      key: 'languages',
      icon: Code2,
      accent: 'pink',
      label: 'Languages',
      description: 'Languages detected from file extensions in the most recent commit.',
      value: m.languagesUsed?.length,
      sub: m.languagesUsed?.slice(0, 3).join(', ') + (m.languagesUsed?.length > 3 ? '…' : '')
    }
  ];

  return (
    <div className="card space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(79,70,229,0.15)' }}>
            <GitCommit size={18} style={{ color: '#818cf8' }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-lg truncate">{m.repoName}</h3>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <span className="truncate max-w-xs">{repoUrl}</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <RiskBadge risk={m.burnoutDetection?.burnoutRisk} />
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg transition-colors"
            title="Delete cached analysis"
          >
            {isDeleting
              ? <Loader2 size={15} className="animate-spin" />
              : <Trash2 size={15} />
            }
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="btn-ghost text-sm"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {expanded ? 'Less' : 'Charts'}
          </button>
        </div>
      </div>

      {/* ── 8 Metric Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRICS.map(metric => (
          <MetricCard
            key={metric.key}
            icon={metric.icon}
            accent={metric.accent}
            label={metric.label}
            description={metric.description}
            value={metric.value}
            sub={metric.sub}
            onClick={() => setModal(metric.key)}
          />
        ))}
      </div>

      {/* ── Expanded Charts ─────────────────────────────────────────── */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-sm">
              <p className="stat-label mb-3">Commits by Day of Week</p>
              <DailyActivityBar dailyActivity={m.timeDateActivity?.dailyActivity} />
            </div>
            <div className="card-sm">
              <p className="stat-label mb-3">Yearly Commit Trend</p>
              <YearlyCommitsLine yearlyCommits={m.yearlyCommits} />
            </div>
          </div>
          <div className="card-sm">
            <p className="stat-label mb-3">Author Contributions</p>
            <AuthorPie authorActivity={m.authorActivity} />
          </div>
        </div>
      )}

      {/* ── Metric Modals ───────────────────────────────────────────── */}
      {METRICS.map(metric => (
        <MetricModal
          key={metric.key}
          metricKey={metric.key}
          data={m}
          isOpen={modal === metric.key}
          onClose={() => setModal(null)}
        />
      ))}
    </div>
  );
}
