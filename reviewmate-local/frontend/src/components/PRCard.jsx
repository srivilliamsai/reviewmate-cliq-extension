import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { FaTrashAlt } from 'react-icons/fa';

const statusMap = {
  open: { emoji: '🟢', label: 'Open', color: 'bg-emerald-500/20 text-emerald-300' },
  closed: { emoji: '🔴', label: 'Closed', color: 'bg-rose-500/20 text-rose-200' },
  merged: { emoji: '🟣', label: 'Merged', color: 'bg-purple-500/20 text-purple-200' }
};

const priorityColors = {
  High: 'bg-rose-500/20 text-rose-200',
  Medium: 'bg-amber-500/20 text-amber-200',
  Low: 'bg-emerald-500/20 text-emerald-200'
};

const PRCard = ({ prData, onDelete }) => {
  const statusInfo = statusMap[prData.status] || statusMap.open;
  const truncatedDescription = prData.description?.slice(0, 150) || 'No description provided.';
  const additions = prData.additions ?? 0;
  const deletions = prData.deletions ?? 0;

  return (
    <article className="bg-rm-card/90 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:shadow-2xl transition">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">{prData.repository} · #{prData.prNumber}</p>
          <h3 className="text-xl font-semibold mt-1 flex items-center gap-2">
            <span>{statusInfo.emoji}</span>
            <span>{prData.title}</span>
          </h3>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${priorityColors[prData.priority] || priorityColors.Low}`}>
            {prData.priority} priority
          </span>
        </div>
      </header>

      <p className="text-sm text-white/70 leading-relaxed">{truncatedDescription}{prData.description?.length > 150 ? '…' : ''}</p>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-white/50">Author</dt>
          <dd className="font-semibold text-white">@{prData.author}</dd>
        </div>
        <div>
          <dt className="text-white/50">Files Changed</dt>
          <dd className="font-semibold text-white">{prData.filesChanged}</dd>
        </div>
        <div>
          <dt className="text-white/50">Lines Added</dt>
          <dd className="font-semibold text-emerald-300">+{additions}</dd>
        </div>
        <div>
          <dt className="text-white/50">Lines Removed</dt>
          <dd className="font-semibold text-rose-300">-{deletions}</dd>
        </div>
      </dl>

      <footer className="flex items-center gap-3 justify-between">
        <a
          href={prData.prUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-100"
        >
          View on GitHub
          <FaArrowUpRightFromSquare />
        </a>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(prData.prId)}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-rose-300 hover:text-rose-200"
          >
            <FaTrashAlt /> Remove
          </button>
        )}
      </footer>
    </article>
  );
};

export default PRCard;
