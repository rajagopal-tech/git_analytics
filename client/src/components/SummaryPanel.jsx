import { useState } from 'react';
import {
  Moon, Calendar, Flame, MessageSquare, GitCommit,
  Code2, Zap, BarChart2, TrendingUp
} from 'lucide-react';
import RiskBadge from './RiskBadge';
import MetricCard from './MetricCard';
import MetricModal from './MetricModal';
import DailyActivityBar from './charts/DailyActivityBar';
import YearlyCommitsLine from './charts/YearlyCommitsLine';
import LanguageBar from './charts/LanguageBar';

export default function SummaryPanel({ summary, totalRepos }) {
  const [modal, setModal] = useState(null);

  if (!summary) return null;
  const s = summary;

  /* ── 8 summary metric definitions ──────────────────────────────────── */
  const METRICS = [
    {
      key: 'commits',
      icon: GitCommit,
      accent: 'brand',
      label: 'Total Commits',
      description: 'Combined non-merge commits across all analysed repositories.',
      value: Object.values(s.yearlyCommits || {}).reduce((a, b) => a + b, 0).toLocaleString(),
      sub: `Most active day: ${s.timeDateActivity?.mostActiveDay}`
    },
    {
      key: 'latenight',
      icon: Moon,
      accent: 'purple',
      label: 'Avg Late Night',
      description: 'Average % of commits made 20:00–04:59 across all repos.',
      value: s.timeDateActivity?.lateNightPercentage,
      sub: `${s.timeDateActivity?.lateNightDetails?.length} total commits`
    },
    {
      key: 'weekend',
      icon: Calendar,
      accent: 'yellow',
      label: 'Avg Weekend',
      description: 'Average % of weekend commits (Sat/Sun) across all repos.',
      value: s.timeDateActivity?.weekendWork,
      sub: `${s.timeDateActivity?.weekendDetails?.length} total commits`
    },
    {
      key: 'churn',
      icon: Flame,
      accent: 'red',
      label: 'Avg Churn',
      description: 'Average % of fix/revert/delete commits — rework indicator.',
      value: s.churnRate,
      sub: `${s.churnDetails?.length} churn commits`
    },
    {
      key: 'burnout',
      icon: Zap,
      accent: 'cyan',
      label: 'Burnout Risk',
      description: 'Highest burnout risk level found across all repos.',
      value: s.burnoutDetection?.burnoutRisk,
      sub: `Streak: ${s.burnoutDetection?.longestStreak} · Idle: ${s.idlePeriods?.longestIdle}`
    },
    {
      key: 'messages',
      icon: MessageSquare,
      accent: 'green',
      label: 'Commit Quality',
      description: 'Average % of commits following conventional message format.',
      value: s.commitMessageStructure?.meaningfulMessages,
      sub: `${s.commitMessageStructure?.commitMessageDetails?.length} messages`
    },
    {
      key: 'large',
      icon: BarChart2,
      accent: 'orange',
      label: 'Large Commits',
      description: 'Total commits changing >100 lines across all repos.',
      value: s.largeCommits?.count,
      sub: `Biggest: ${s.largeCommits?.biggestCommitSize}`
    },
    {
      key: 'languages',
      icon: Code2,
      accent: 'pink',
      label: 'Languages',
      description: 'Unique languages detected across all analysed repositories.',
      value: s.languagesUsed?.length,
      sub: s.languagesUsed?.slice(0, 3).join(', ') + (s.languagesUsed?.length > 3 ? '…' : '')
    }
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Aggregate Summary</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Across {totalRepos} {totalRepos === 1 ? 'repository' : 'repositories'}
          </p>
        </div>
        <RiskBadge risk={s.burnoutDetection?.burnoutRisk} />
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

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-sm">
          <p className="stat-label mb-3">Commits by Day (All Repos)</p>
          <DailyActivityBar dailyActivity={s.timeDateActivity?.dailyActivity} />
        </div>
        <div className="card-sm">
          <p className="stat-label mb-3">Yearly Commit Trend (All Repos)</p>
          <YearlyCommitsLine yearlyCommits={s.yearlyCommits} />
        </div>
      </div>

      <div className="card-sm">
        <p className="stat-label mb-3">Languages Across All Repos</p>
        <LanguageBar languagesUsed={s.languagesUsed} />
      </div>

      {/* ── Metric Modals ───────────────────────────────────────────── */}
      {METRICS.map(metric => (
        <MetricModal
          key={metric.key}
          metricKey={metric.key}
          data={s}
          isOpen={modal === metric.key}
          onClose={() => setModal(null)}
        />
      ))}
    </div>
  );
}
