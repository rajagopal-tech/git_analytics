import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value} commits</p>
    </div>
  );
};

export default function YearlyCommitsLine({ yearlyCommits }) {
  const data = Object.entries(yearlyCommits || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, commits]) => ({ year, commits }));

  if (!data.length) return <p className="text-gray-600 text-sm text-center py-8">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="commits"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={<Dot r={4} fill="#6366f1" stroke="#1e1b4b" strokeWidth={2} />}
          activeDot={{ r: 6, fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
