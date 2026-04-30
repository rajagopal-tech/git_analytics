import { useState } from 'react';
import { HardDrive, Trash2, Loader2, AlertTriangle, FolderOpen, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useClones, useDeleteClone, useClearAllClones } from '../hooks/useAnalysis';

export default function ClonesManager({ onToast }) {
  const [open, setOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { data, isLoading, refetch } = useClones();
  const { mutate: deleteClone, isPending: isDeleting, variables: deletingName } = useDeleteClone();
  const { mutate: clearAll, isPending: isClearing } = useClearAllClones();

  const clones = data?.clones || [];
  const totalSizeMB = data?.totalSizeMB || 0;

  const handleDeleteOne = (name) => {
    deleteClone(name, {
      onSuccess: () => onToast(`Deleted cloned repo: ${name}`),
      onError: (err) => onToast(err.response?.data?.message || 'Delete failed', 'error')
    });
  };

  const handleClearAll = () => {
    clearAll(undefined, {
      onSuccess: () => {
        setConfirmClearAll(false);
        onToast('All cloned repositories cleared');
      },
      onError: (err) => {
        setConfirmClearAll(false);
        onToast(err.response?.data?.message || 'Clear failed', 'error');
      }
    });
  };

  return (
    <div className="card">
      {/* ── Header row ──────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) refetch(); }}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(249,115,22,0.12)' }}>
            <HardDrive size={16} style={{ color: '#fb923c' }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Cloned Repositories</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLoading
                ? 'Loading…'
                : `${clones.length} folder${clones.length !== 1 ? 's' : ''} · ${totalSizeMB} MB on disk`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {clones.length > 0 && (
            <span
              className="badge text-xs"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}
            >
              {clones.length}
            </span>
          )}
          {open ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </div>
      </button>

      {/* ── Expanded panel ──────────────────────────────────────────── */}
      {open && (
        <div className="mt-4 space-y-3">

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 py-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Scanning disk…</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && clones.length === 0 && (
            <div className="flex items-center gap-3 py-4 text-gray-600">
              <FolderOpen size={18} />
              <span className="text-sm">No cloned repositories on disk</span>
            </div>
          )}

          {/* Clone list */}
          {!isLoading && clones.length > 0 && (
            <>
              <div className="divide-y divide-gray-800 rounded-xl overflow-hidden border border-gray-800">
                {clones.map(clone => (
                  <div
                    key={clone.name}
                    className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-900 hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderOpen size={14} className="text-gray-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-200 truncate">{clone.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-500 font-mono">{clone.sizeMB} MB</span>
                      <button
                        onClick={() => handleDeleteOne(clone.name)}
                        disabled={isDeleting && deletingName === clone.name}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={`Delete ${clone.name}`}
                      >
                        {isDeleting && deletingName === clone.name
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear all — with inline confirm */}
              <div className="pt-1">
                {!confirmClearAll ? (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    disabled={isClearing}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear all cloned repos ({totalSizeMB} MB)
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-900/20 border border-red-800/50">
                    <AlertTriangle size={15} className="text-red-400 shrink-0" />
                    <p className="text-sm text-red-300 flex-1">
                      Delete all {clones.length} cloned folders? This cannot be undone.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleClearAll}
                        disabled={isClearing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isClearing
                          ? <><Loader2 size={12} className="animate-spin" /> Clearing…</>
                          : 'Yes, delete all'
                        }
                      </button>
                      <button
                        onClick={() => setConfirmClearAll(false)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
