/**
 * Feature 3: Historical tracking
 * Shows trend lines for key metrics across multiple analysis runs.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRepoHistory } from '../hooks/useAnalysis';
import { TrendingUp, Loader2 } from 'lucide-react';

function parseNum(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function HistoryChart({ repoName }) {
  const { data, isLoading } = useRepoHistory(repoName);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-4">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }

  const history = data?.history || [];
  if (history.length < 2) {
    return (
      <p className="text-xs text-gray-600 py-2">
        Analyze this repo again to start tracking trends. ({history.length} run{history.length !== 1 ? 's' : ''} recorded)
      </p>
    );
  }

  const chartData = [...history].reverse().map((h, i) => ({
    run: `Run ${i + 1}`,
    date: new Date(h.analyzedAt).toLocaleDateString(),
    commits: h.snapshot.totalCommits,
    health: h.snapshot.healthScore,
    lateNight: parseNum(h.snapshot.lateNightPct),
    churn: parseNum(h.snapshot.churnRate),
    conventional: parseNum(h.snapshot.conventionalPct)
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} style={{ color: '#22d3ee' }} />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Trend over {history.length} runs
        </p>
      </div>

      {/* Health score trend */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Health Score & Commit Quality</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="run" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="health" name="Health" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="conventional" name="Conventional %" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk metrics trend */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Risk Metrics (lower is better)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="run" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="lateNight" name="Late Night %" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="churn" name="Churn %" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
