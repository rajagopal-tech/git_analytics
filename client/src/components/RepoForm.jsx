import { useState } from 'react';
import { GitBranch, Loader2, RefreshCw, ChevronDown } from 'lucide-react';

const TIMEZONES = [
  { label: 'IST — India (UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'EST — New York (UTC-5)', value: 'America/New_York' },
  { label: 'PST — Los Angeles (UTC-8)', value: 'America/Los_Angeles' },
  { label: 'GMT — London (UTC+0)', value: 'Europe/London' },
  { label: 'CET — Paris (UTC+1)', value: 'Europe/Paris' },
  { label: 'JST — Tokyo (UTC+9)', value: 'Asia/Tokyo' },
  { label: 'AEST — Sydney (UTC+10)', value: 'Australia/Sydney' }
];

export default function RepoForm({ onAnalyze, isLoading }) {
  const [urls, setUrls] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [forceRefresh, setForceRefresh] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const repoUrls = urls
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);

    if (!repoUrls.length) return;
    onAnalyze({ repoUrls, timezone, forceRefresh });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-brand-600/20 rounded-lg">
          <GitBranch className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Analyze Repositories</h2>
          <p className="text-xs text-gray-500">Enter one GitHub URL per line</p>
        </div>
      </div>

      <textarea
        className="input font-mono text-sm resize-none"
        rows={4}
        value={urls}
        onChange={e => setUrls(e.target.value)}
        placeholder={`https://github.com/user/repo1.git\nhttps://github.com/org/repo2.git`}
        required
        disabled={isLoading}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Timezone selector */}
        <div className="relative flex-1">
          <select
            className="input appearance-none pr-10 cursor-pointer"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            disabled={isLoading}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Force refresh toggle */}
        <label className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl cursor-pointer hover:border-gray-600 transition-colors">
          <input
            type="checkbox"
            checked={forceRefresh}
            onChange={e => setForceRefresh(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-300 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Force refresh
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={isLoading || !urls.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4" />
              Analyze
            </>
          )}
        </button>
      </div>
    </form>
  );
}
