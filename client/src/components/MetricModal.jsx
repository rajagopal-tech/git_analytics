import DetailModal from './DetailModal';
import CommitTable from './CommitTable';
import DailyActivityBar from './charts/DailyActivityBar';
import YearlyCommitsLine from './charts/YearlyCommitsLine';
import AuthorPie from './charts/AuthorPie';
import LanguageBar from './charts/LanguageBar';

/* ── shared column definitions ─────────────────────────────────────── */
const BASE_COLS = [
  {
    key: 'author', label: 'Author',
    render: c => <span className="font-medium text-white">{c.author}</span>
  },
  {
    key: 'time', label: 'Time',
    render: c => (
      <span className="font-mono text-xs text-gray-400 whitespace-nowrap">
        {c.time || c.timeIST}
      </span>
    )
  },
  {
    key: 'message', label: 'Message',
    render: c => (
      <span className="text-gray-300 block max-w-sm truncate" title={c.message}>
        {c.message}
      </span>
    )
  },
  {
    key: 'hash', label: 'Hash',
    render: c => (
      <span className="font-mono text-xs text-gray-600">{c.hash?.slice(0, 7)}</span>
    )
  }
];

/* ── stat pill helper ───────────────────────────────────────────────── */
function Pill({ label, value, color = '#6366f1' }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-gray-800 border border-gray-700">
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}

/* ── section heading ────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MetricModal — renders the right content for each metric key
   ══════════════════════════════════════════════════════════════════════ */
export default function MetricModal({ metricKey, data, isOpen, onClose }) {
  if (!isOpen || !data) return null;

  const m = data;

  /* ── 1. Total Commits ─────────────────────────────────────────────── */
  if (metricKey === 'commits') {
    const years = Object.entries(m.yearlyCommits || {}).sort(([a], [b]) => a - b);
    return (
      <DetailModal title="Total Commits" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Total" value={m.totalCommits?.toLocaleString()} color="#818cf8" />
            <Pill label="Most Active Day" value={m.timeDateActivity?.mostActiveDay} color="#34d399" />
            <Pill label="Authors" value={Object.keys(m.authorActivity || {}).length} color="#22d3ee" />
          </div>
          <Section title="Commits per Year">
            <YearlyCommitsLine yearlyCommits={m.yearlyCommits} />
          </Section>
          <Section title="Commits by Day of Week">
            <DailyActivityBar dailyActivity={m.timeDateActivity?.dailyActivity} />
          </Section>
          <Section title="Author Breakdown">
            <AuthorPie authorActivity={m.authorActivity} />
          </Section>
          <Section title="Year-by-Year">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 uppercase pb-2 pr-4">Year</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Commits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {years.map(([year, count]) => (
                  <tr key={year}>
                    <td className="py-2 pr-4 text-gray-400 font-mono">{year}</td>
                    <td className="py-2 font-semibold text-white">{count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 2. Late Night ────────────────────────────────────────────────── */
  if (metricKey === 'latenight') {
    const byYear = m.lateNightByYearPct || {};
    return (
      <DetailModal title="Late Night Commits (20:00 – 04:59)" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Overall %" value={m.timeDateActivity?.lateNightPercentage} color="#a78bfa" />
            <Pill label="Total commits" value={m.timeDateActivity?.lateNightDetails?.length} color="#a78bfa" />
          </div>
          <Section title="% per Year">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 uppercase pb-2 pr-4">Year</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Late Night %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {Object.entries(byYear).sort(([a],[b])=>a-b).map(([year, pct]) => (
                  <tr key={year}>
                    <td className="py-2 pr-4 text-gray-400 font-mono">{year}</td>
                    <td className="py-2 font-semibold text-purple-400">{pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="All Late Night Commits">
            <CommitTable commits={m.timeDateActivity?.lateNightDetails} columns={BASE_COLS} />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 3. Weekend Work ──────────────────────────────────────────────── */
  if (metricKey === 'weekend') {
    const byYear = m.weekendByYearPct || {};
    return (
      <DetailModal title="Weekend Work (Sat & Sun)" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Overall %" value={m.timeDateActivity?.weekendWork} color="#fbbf24" />
            <Pill label="Total commits" value={m.timeDateActivity?.weekendDetails?.length} color="#fbbf24" />
          </div>
          <Section title="% per Year">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 uppercase pb-2 pr-4">Year</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Weekend %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {Object.entries(byYear).sort(([a],[b])=>a-b).map(([year, pct]) => (
                  <tr key={year}>
                    <td className="py-2 pr-4 text-gray-400 font-mono">{year}</td>
                    <td className="py-2 font-semibold text-yellow-400">{pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="All Weekend Commits">
            <CommitTable
              commits={m.timeDateActivity?.weekendDetails}
              columns={[
                BASE_COLS[0],
                {
                  key: 'day', label: 'Day',
                  render: c => <span className="text-yellow-400 font-medium">{c.day}</span>
                },
                BASE_COLS[1],
                BASE_COLS[2],
                BASE_COLS[3]
              ]}
            />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 4. Churn Rate ────────────────────────────────────────────────── */
  if (metricKey === 'churn') {
    const byYear = m.churnByYearPct || {};
    return (
      <DetailModal title="Churn Rate (fix / revert / delete)" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Overall %" value={m.churnRate} color="#f87171" />
            <Pill label="Churn commits" value={m.churnDetails?.length} color="#f87171" />
          </div>
          <Section title="% per Year">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 uppercase pb-2 pr-4">Year</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Churn %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {Object.entries(byYear).sort(([a],[b])=>a-b).map(([year, pct]) => (
                  <tr key={year}>
                    <td className="py-2 pr-4 text-gray-400 font-mono">{year}</td>
                    <td className="py-2 font-semibold text-red-400">{pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="All Churn Commits">
            <CommitTable commits={m.churnDetails} columns={BASE_COLS} />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 5. Burnout / Streak ──────────────────────────────────────────── */
  if (metricKey === 'burnout') {
    return (
      <DetailModal title="Burnout Detection" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Risk Level" value={m.burnoutDetection?.burnoutRisk} color={
              m.burnoutDetection?.burnoutRisk === 'High' ? '#f87171' :
              m.burnoutDetection?.burnoutRisk === 'Medium' ? '#fbbf24' : '#34d399'
            } />
            <Pill label="Longest Streak" value={m.burnoutDetection?.longestStreak} color="#22d3ee" />
            <Pill label="Longest Idle" value={m.idlePeriods?.longestIdle} color="#a78bfa" />
          </div>
          <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 leading-relaxed">
            <strong className="text-white">How it's calculated:</strong> The longest run of consecutive calendar days
            with at least one commit. Streaks &gt;20 days = High risk, &gt;10 = Medium, otherwise Low.
          </div>
          <Section title="Idle Periods (gaps ≥ 7 days)">
            <CommitTable
              commits={m.burnoutDetection?.idlePeriodDetails}
              columns={[
                { key: 'gapDays', label: 'Gap', render: c => <span className="text-red-400 font-bold">{c.gapDays}d</span> },
                { key: 'from', label: 'From', render: c => <span className="font-mono text-xs text-gray-400">{c.from || c.fromIST}</span> },
                { key: 'to', label: 'To', render: c => <span className="font-mono text-xs text-gray-400">{c.to || c.toIST}</span> },
                { key: 'resumedBy', label: 'Resumed By', render: c => <span className="text-white">{c.resumedBy}</span> }
              ]}
            />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 6. Commit Messages ───────────────────────────────────────────── */
  if (metricKey === 'messages') {
    const details = m.commitMessageStructure?.commitMessageDetails || [];
    const conventional = details.filter(c => c.isConventional).length;
    const nonConventional = details.length - conventional;
    return (
      <DetailModal title="Commit Message Quality" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Conventional %" value={m.commitMessageStructure?.meaningfulMessages} color="#34d399" />
            <Pill label="Conventional" value={conventional} color="#34d399" />
            <Pill label="Non-conventional" value={nonConventional} color="#f87171" />
          </div>
          <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 leading-relaxed">
            <strong className="text-white">Conventional format:</strong>{' '}
            <code className="text-green-400 font-mono text-xs">type(scope): description</code>
            {' '}— e.g. <code className="text-green-400 font-mono text-xs">feat(auth): add OAuth login</code>.
            Types: feat, fix, docs, style, refactor, test, chore.
          </div>
          <Section title="All Commits (latest 200)">
            <CommitTable
              commits={details.slice(0, 200)}
              columns={[
                BASE_COLS[0],
                BASE_COLS[2],
                {
                  key: 'isConventional', label: 'Format',
                  render: c => c.isConventional
                    ? <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>✓ Conventional</span>
                    : <span className="badge" style={{ background: 'rgba(107,114,128,0.2)', color: '#6b7280' }}>Free-form</span>
                },
                BASE_COLS[3]
              ]}
            />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 7. Large Commits ─────────────────────────────────────────────── */
  if (metricKey === 'large') {
    const byYear = m.largeCommitsByYear || {};
    return (
      <DetailModal title="Large Commits (> 100 lines changed)" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Count" value={m.largeCommits?.count} color="#fbbf24" />
            <Pill label="Biggest" value={m.largeCommits?.biggestCommitSize} color="#fbbf24" />
          </div>
          <Section title="Count per Year">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 uppercase pb-2 pr-4">Year</th>
                  <th className="text-left text-xs text-gray-500 uppercase pb-2">Large Commits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {Object.entries(byYear).sort(([a],[b])=>a-b).map(([year, count]) => (
                  <tr key={year}>
                    <td className="py-2 pr-4 text-gray-400 font-mono">{year}</td>
                    <td className="py-2 font-semibold text-yellow-400">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="All Large Commits">
            <CommitTable
              commits={m.largeCommits?.details}
              columns={[
                BASE_COLS[0],
                {
                  key: 'totalChanges', label: 'Lines Changed',
                  render: c => (
                    <span className="font-bold text-yellow-400">
                      +{c.insertions} / -{c.deletions}
                    </span>
                  )
                },
                BASE_COLS[2],
                BASE_COLS[3]
              ]}
            />
          </Section>
        </div>
      </DetailModal>
    );
  }

  /* ── 8. Languages ─────────────────────────────────────────────────── */
  if (metricKey === 'languages') {
    return (
      <DetailModal title="Languages Detected" isOpen={isOpen} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Languages" value={m.languagesUsed?.length} color="#fb923c" />
          </div>
          <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 leading-relaxed">
            <strong className="text-white">How it's detected:</strong> File extensions from the most recent commit
            are mapped to language names. This is a fast heuristic — it reflects what was touched last, not the
            full repo composition.
          </div>
          <Section title="Detected Languages">
            <LanguageBar languagesUsed={m.languagesUsed} />
          </Section>
          <Section title="Full List">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(m.languagesUsed || []).map((lang, i) => (
                <div key={lang} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-800 border border-gray-700">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor: ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16','#f97316','#14b8a6'][i % 10]
                  }} />
                  <span className="text-sm text-gray-200">{lang}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </DetailModal>
    );
  }

  return null;
}
