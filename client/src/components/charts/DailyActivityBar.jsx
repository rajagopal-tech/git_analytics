import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKEND = ['Saturday', 'Sunday'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value} commits</p>
    </div>
  );
};

export default function DailyActivityBar({ dailyActivity }) {
  const data = DAYS.map(day => ({
    day: day.slice(0, 3),
    fullDay: day,
    commits: dailyActivity?.[day] || 0
  }));

  const max = Math.max(...data.map(d => d.commits));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="commits" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.fullDay}
              fill={
                WEEKEND.includes(entry.fullDay)
                  ? '#f59e0b'
                  : entry.commits === max
                  ? '#6366f1'
                  : '#3730a3'
              }
              opacity={entry.commits === 0 ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
