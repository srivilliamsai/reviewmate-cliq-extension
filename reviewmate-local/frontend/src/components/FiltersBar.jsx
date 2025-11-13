const FiltersBar = ({ filters, onChange, repositoryOptions }) => {
  const handleChange = (key) => (event) => {
    onChange({ ...filters, [key]: event.target.value });
  };

  return (
    <div className="bg-rm-card/70 border border-white/10 rounded-2xl p-4 grid gap-3 md:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-white/50">Status</label>
        <select
          value={filters.status}
          onChange={handleChange('status')}
          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="merged">Merged</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-white/50">Priority</label>
        <select
          value={filters.priority}
          onChange={handleChange('priority')}
          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">All</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-white/50">Repository</label>
        <select
          value={filters.repository}
          onChange={handleChange('repository')}
          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">All</option>
          {repositoryOptions.map((repo) => (
            <option key={repo} value={repo}>
              {repo}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-white/50">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={handleChange('sortBy')}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="date">Date</option>
            <option value="lines">Lines Changed</option>
            <option value="files">Files Changed</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-white/50">Direction</label>
          <select
            value={filters.sortDir}
            onChange={handleChange('sortDir')}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
