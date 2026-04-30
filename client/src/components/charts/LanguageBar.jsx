import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
];

export default function LanguageBar({ languagesUsed }) {
  if (!languagesUsed?.length) {
    return <p className="text-gray-600 text-sm text-center py-8">No language data</p>;
  }

  const data = languagesUsed.map((lang, i) => ({ lang, count: 1, color: COLORS[i % COLORS.length] }));

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {languagesUsed.map((lang, i) => (
        <span
          key={lang}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 border border-gray-700"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
          {lang}
        </span>
      ))}
    </div>
  );
}
