import { useState } from 'react';

const BatchImportPanel = ({ onUpload, progressEntries }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Select a CSV file with PR URLs');
      return;
    }
    setError('');
    setUploading(true);
    try {
      await onUpload(file);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="bg-rm-card/70 border border-white/10 rounded-2xl p-5 space-y-3">
      <header>
        <h3 className="text-lg font-semibold">Batch Import</h3>
        <p className="text-sm text-white/60">Upload a CSV file of PR URLs to process them automatically.</p>
      </header>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError('');
          }}
          className="text-sm text-white"
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="self-start px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Start Import'}
        </button>
      </form>

      {progressEntries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm uppercase tracking-wide text-white/50">Recent Batches</h4>
          {progressEntries.map((entry) => (
            <div key={entry.batchId} className="bg-black/20 rounded-xl p-3 text-sm border border-white/5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Batch {entry.batchId.slice(0, 6)}…</span>
                <span className="text-white/60">{entry.status}</span>
              </div>
              <div className="mt-1 text-white/70">
                {entry.processed}/{entry.total} processed · {entry.successes} success · {entry.failures} failed
              </div>
              {entry.lastResult && (
                <div className="mt-1 text-xs text-white/60">
                  Last: {entry.lastResult.prUrl || '—'} ({entry.lastResult.status})
                  {entry.lastResult.message ? ` – ${entry.lastResult.message}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default BatchImportPanel;
