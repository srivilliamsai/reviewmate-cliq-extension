const Bar = ({ label, value, max }) => {
  const percentage = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full mt-1">
        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const AnalyticsPanel = ({ analytics }) => {
  if (!analytics) {
    return (
      <section className="bg-rm-card/70 border border-white/10 rounded-2xl p-5 text-white/60 text-sm">
        Analytics loading…
      </section>
    );
  }

  const { statusCounts, averageReviewTimeHours, repositoryActivity, topContributors } = analytics;
  const maxRepoCount = Math.max(1, ...repositoryActivity.map((item) => item.count));
  const maxContributor = Math.max(1, ...topContributors.map((item) => item.count));

  return (
    <section className="bg-rm-card/70 border border-white/10 rounded-2xl p-5 space-y-4">
      <header>
        <h3 className="text-lg font-semibold">Analytics</h3>
        <p className="text-sm text-white/60">Live snapshots of your review workload.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">PRs by Status</p>
          <div className="mt-3 space-y-2">
            {['open', 'merged', 'closed'].map((status) => (
              <Bar key={status} label={status} value={statusCounts[status] || 0} max={Math.max(...Object.values(statusCounts)) || 1} />
            ))}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wide text-white/50">Average Review Time</p>
          <p className="text-4xl font-black mt-4">{averageReviewTimeHours}h</p>
          <p className="text-xs text-white/60">Completed (closed/merged) PRs</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-white/50">Top Repositories</p>
          {repositoryActivity.length === 0 && <p className="text-sm text-white/60">No data yet.</p>}
          {repositoryActivity.map((item) => (
            <Bar key={item.repo} label={item.repo} value={item.count} max={maxRepoCount} />
          ))}
        </div>
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-white/50">Top Contributors</p>
          {topContributors.length === 0 && <p className="text-sm text-white/60">No data yet.</p>}
          {topContributors.map((item) => (
            <Bar key={item.author} label={item.author} value={item.count} max={maxContributor} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnalyticsPanel;
