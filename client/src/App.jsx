import { useState } from 'react';
import {
  GitBranch, AlertCircle, CheckCircle2, History,
  Loader2, Trash2, RotateCcw
} from 'lucide-react';
import RepoForm from './components/RepoForm';
import RepoCard from './components/RepoCard';
import SummaryPanel from './components/SummaryPanel';
import ClonesManager from './components/ClonesManager';
import CompareView from './components/CompareView';
import { useAnalyze, useAllResults, useDeleteResult } from './hooks/useAnalysis';

/* ── Toast ──────────────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const styles = {
    success: 'bg-green-900/90 border-green-700 text-green-200',
    warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-200',
    error:   'bg-red-900/90   border-red-700   text-red-200'
  };
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${styles[toast.type] || styles.success}`}>
      {toast.type === 'success'
        ? <CheckCircle2 size={15} />
        : <AlertCircle size={15} />
      }
      {toast.message}
    </div>
  );
}

/* ── Loading spinner ────────────────────────────────────────────────── */
function AnalyzingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
        <div
          className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1 transparent transparent transparent' }}
        />
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-semibold">Analyzing repositories…</p>
        <p className="text-gray-500 text-sm">Cloning, parsing commits, computing metrics</p>
        <p className="text-gray-600 text-xs mt-2">Large repos may take a minute</p>
      </div>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [summaryData, setSummaryData]         = useState(null);
  const [toast, setToast]                     = useState(null);

  const { mutate: analyze, isPending: isAnalyzing }                          = useAnalyze();
  const { data: allResults, isLoading: loadingHistory }                      = useAllResults();
  const { mutate: deleteResult, isPending: isDeleting, variables: deletingRepo } = useDeleteResult();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAnalyze = ({ repoUrls, timezone, forceRefresh }) => {
    analyze(
      { repoUrls, timezone, forceRefresh },
      {
        onSuccess: (data) => {
          setAnalysisResults(data.results);
          setSummaryData(data.summary);
          const failed = data.totalFailed;
          const ok     = data.totalAnalyzed;
          showToast(
            `${ok} repo${ok !== 1 ? 's' : ''} analyzed${failed ? ` · ${failed} failed` : ''}`,
            failed > 0 ? 'warning' : 'success'
          );
        },
        onError: (err) => {
          showToast(err.response?.data?.message || 'Analysis failed', 'error');
        }
      }
    );
  };

  const handleDelete = (repoName) => {
    deleteResult(repoName, {
      onSuccess: () => {
        showToast(`Cache deleted for ${repoName}`);
        setAnalysisResults(prev =>
          prev ? prev.filter(r => r.data?.repoName !== repoName) : prev
        );
      },
      onError: () => showToast('Failed to delete', 'error')
    });
  };

  // Re-analyze a cached repo from the history panel
  const handleReAnalyze = (repoUrl) => {
    handleAnalyze({ repoUrls: [repoUrl], timezone: 'Asia/Kolkata', forceRefresh: true });
  };

  const hasResults   = !isAnalyzing && analysisResults;
  const showHistory  = !isAnalyzing && !analysisResults;
  const errorResults = analysisResults?.filter(r => r.error) ?? [];
  const goodResults  = analysisResults?.filter(r => !r.error && r.data) ?? [];

  return (
    <div className="min-h-screen" style={{ background: '#030712' }}>
      <Toast toast={toast} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(17,24,39,0.8)', backdropFilter: 'blur(12px)', borderColor: '#1f2937' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: '#4f46e5' }}>
              <GitBranch size={18} color="#fff" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Git Dev Analytics</h1>
              <p className="text-xs text-gray-500 mt-0.5">Developer behaviour insights</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {allResults?.count > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <History size={13} />
                <span>{allResults.count} cached</span>
              </div>
            )}
            {/* Back to history button when results are showing */}
            {hasResults && (
              <button
                onClick={() => { setAnalysisResults(null); setSummaryData(null); }}
                className="btn-ghost text-sm"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Analyze form */}
        <RepoForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />

        {/* Disk manager */}
        <ClonesManager onToast={showToast} />

        {/* Compare panel — only when 2+ repos cached */}
        {allResults?.results?.length >= 2 && (
          <CompareView cachedRepos={allResults.results} />
        )}

        {/* Loading */}
        {isAnalyzing && <AnalyzingSpinner />}

        {/* ── Results ─────────────────────────────────────────────── */}
        {hasResults && (
          <div className="space-y-6">

            {/* Errors */}
            {errorResults.map(r => (
              <div
                key={r.url}
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{ background: 'rgba(127,29,29,0.2)', borderColor: 'rgba(185,28,28,0.4)' }}
              >
                <AlertCircle size={16} color="#f87171" className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-300 truncate">{r.url}</p>
                  <p className="text-xs text-red-400/80 mt-0.5">{r.error}</p>
                </div>
              </div>
            ))}

            {/* Aggregate summary — only for 2+ repos */}
            {summaryData && goodResults.length > 1 && (
              <div className="card">
                <SummaryPanel summary={summaryData} totalRepos={goodResults.length} />
              </div>
            )}

            {/* Per-repo cards */}
            {goodResults.map(r => (
              <RepoCard
                key={r.url}
                data={r.data}
                repoUrl={r.url}
                onDelete={() => handleDelete(r.data.repoName)}
                isDeleting={isDeleting && deletingRepo === r.data.repoName}
              />
            ))}
          </div>
        )}

        {/* ── History ─────────────────────────────────────────────── */}
        {showHistory && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <History size={15} className="text-gray-500" />
                <h2 className="font-semibold text-white">Previously Analyzed</h2>
              </div>
              {allResults?.count > 0 && (
                <span className="text-xs text-gray-600">{allResults.count} repo{allResults.count !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loadingHistory ? (
              <div className="flex items-center gap-2 text-gray-500 py-6">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : allResults?.results?.length > 0 ? (
              <div className="divide-y" style={{ borderColor: '#1f2937' }}>
                {allResults.results.map(r => (
                  <div key={r._id} className="flex items-center justify-between py-3.5 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{r.repoName}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{r.repoUrl}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-700">
                        {new Date(r.analyzedAt).toLocaleDateString()}
                      </span>
                      {/* Re-analyze */}
                      <button
                        onClick={() => handleReAnalyze(r.repoUrl)}
                        disabled={isAnalyzing}
                        className="p-1.5 text-gray-600 hover:text-indigo-400 rounded-lg transition-colors"
                        title="Re-analyze"
                      >
                        <RotateCcw size={13} />
                      </button>
                      {/* Delete cache */}
                      <button
                        onClick={() => handleDelete(r.repoName)}
                        disabled={isDeleting && deletingRepo === r.repoName}
                        className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete cache"
                      >
                        {isDeleting && deletingRepo === r.repoName
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(79,70,229,0.1)' }}
                >
                  <GitBranch size={24} style={{ color: '#4f46e5' }} />
                </div>
                <p className="text-gray-400 font-medium">No repositories analyzed yet</p>
                <p className="text-gray-600 text-sm">Paste a GitHub URL above and hit Analyze</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t mt-16 py-6" style={{ borderColor: '#1f2937' }}>
        <p className="text-center text-xs text-gray-700">
          Git Dev Analytics · MERN Stack · Built with React, Express, MongoDB
        </p>
      </footer>
    </div>
  );
}
