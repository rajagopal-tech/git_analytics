import { useState } from 'react';
import { GitBranch, AlertCircle, CheckCircle2, History, Loader2, Trash2 } from 'lucide-react';
import RepoForm from './components/RepoForm';
import RepoCard from './components/RepoCard';
import SummaryPanel from './components/SummaryPanel';
import ClonesManager from './components/ClonesManager';
import { useAnalyze, useAllResults, useDeleteResult } from './hooks/useAnalysis';

export default function App() {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [toast, setToast] = useState(null);

  const { mutate: analyze, isPending: isAnalyzing } = useAnalyze();
  const { data: allResults, isLoading: loadingHistory } = useAllResults();
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
          const ok = data.totalAnalyzed;
          showToast(
            `Analyzed ${ok} repo${ok !== 1 ? 's' : ''}${failed ? ` · ${failed} failed` : ''}`,
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
        showToast(`Deleted cache for ${repoName}`);
        // Remove from current results if visible
        setAnalysisResults(prev =>
          prev ? prev.filter(r => r.data?.repoName !== repoName) : prev
        );
      },
      onError: () => showToast('Failed to delete', 'error')
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-900/80 border-green-700 text-green-200' :
            toast.type === 'warning' ? 'bg-yellow-900/80 border-yellow-700 text-yellow-200' :
            'bg-red-900/80 border-red-700 text-red-200'}`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 rounded-xl">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Git Dev Analytics</h1>
              <p className="text-xs text-gray-500 mt-0.5">Developer behavior insights</p>
            </div>
          </div>

          {/* History count */}
          {allResults?.count > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <History className="w-4 h-4" />
              <span>{allResults.count} cached</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Form */}
        <RepoForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />

        {/* Cloned repos disk manager */}
        <ClonesManager onToast={showToast} />

        {/* Loading state */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-800" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Analyzing repositories...</p>
              <p className="text-gray-500 text-sm mt-1">Cloning and parsing commit history</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!isAnalyzing && analysisResults && (
          <div className="space-y-6">
            {/* Errors */}
            {analysisResults.filter(r => r.error).map(r => (
              <div key={r.url} className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">{r.url}</p>
                  <p className="text-xs text-red-400/80 mt-0.5">{r.error}</p>
                </div>
              </div>
            ))}

            {/* Summary (only if multiple repos) */}
            {summaryData && analysisResults.filter(r => !r.error).length > 1 && (
              <div className="card">
                <SummaryPanel
                  summary={summaryData}
                  totalRepos={analysisResults.filter(r => !r.error).length}
                />
              </div>
            )}

            {/* Per-repo cards */}
            {analysisResults
              .filter(r => !r.error && r.data)
              .map(r => (
                <RepoCard
                  key={r.url}
                  data={r.data}
                  repoUrl={r.url}
                  onDelete={() => handleDelete(r.data.repoName)}
                  isDeleting={isDeleting && deletingRepo === r.data.repoName}
                />
              ))
            }
          </div>
        )}

        {/* History — cached repos */}
        {!isAnalyzing && !analysisResults && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-white">Previously Analyzed</h2>
            </div>

            {loadingHistory ? (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading history...</span>
              </div>
            ) : allResults?.results?.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {allResults.results.map(r => (
                  <div key={r._id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{r.repoName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{r.repoUrl}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-600">
                        {new Date(r.analyzedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDelete(r.repoName)}
                        disabled={isDeleting && deletingRepo === r.repoName}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        {isDeleting && deletingRepo === r.repoName
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GitBranch className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No repositories analyzed yet</p>
                <p className="text-gray-600 text-xs mt-1">Enter a GitHub URL above to get started</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
