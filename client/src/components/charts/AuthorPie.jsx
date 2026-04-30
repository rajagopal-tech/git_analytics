import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{payload[0].name}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value} commits</p>
    </div>
  );
};

export default function AuthorPie({ authorActivity }) {
  const entries = Object.entries(authorActivity || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (!entries.length) return <p className="text-gray-600 text-sm text-center py-8">No data</p>;

  const data = entries.map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-gray-400 truncate" style={{ maxWidth: 100 }}>
              {value.length > 14 ? value.slice(0, 14) + '…' : value}
            </span>
          )}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
