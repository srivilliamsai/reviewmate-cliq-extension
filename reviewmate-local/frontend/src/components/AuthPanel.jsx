import { useState } from 'react';
import { loginUser, registerUser, setStoredAuthToken, updateGithubToken } from '../services/api.js';

const initialForm = {
  email: '',
  password: '',
  githubToken: ''
};

const AuthPanel = ({ authUser, onAuthSuccess, onLogout }) => {
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tokenUpdate, setTokenUpdate] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { email: form.email, password: form.password };
      let result;
      if (mode === 'register') {
        result = await registerUser({ ...payload, githubToken: form.githubToken });
      } else {
        result = await loginUser(payload);
      }
      onAuthSuccess(result.user);
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Auth failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    setStoredAuthToken('');
    setForm(initialForm);
    setTokenUpdate('');
    onLogout();
  };

  const handleTokenUpdate = async (event) => {
    event.preventDefault();
    if (!tokenUpdate) return;
    setBusy(true);
    setError('');
    try {
      await updateGithubToken({ githubToken: tokenUpdate });
      setTokenUpdate('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update token');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-rm-card/70 border border-white/10 rounded-2xl p-5 space-y-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Authentication</p>
        {authUser ? (
          <span className="text-white/80">Signed in as {authUser.email}</span>
        ) : (
          <span className="text-white/60">Create an account or log in to submit PRs.</span>
        )}
      </header>

      {!authUser && (
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label htmlFor="auth-email" className="text-xs uppercase tracking-wide text-white/60">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="auth-password" className="text-xs uppercase tracking-wide text-white/60">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
            />
          </div>

          {mode === 'register' && (
            <div className="grid gap-1">
              <label htmlFor="auth-token" className="text-xs uppercase tracking-wide text-white/60">GitHub Token</label>
              <input
                id="auth-token"
                name="githubToken"
                type="password"
                value={form.githubToken}
                onChange={handleChange}
                required
                className="rounded-xl bg-black/30 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
              />
              <p className="text-[11px] text-white/50">Stored securely & used for GitHub API calls.</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Please wait…' : mode === 'register' ? 'Register' : 'Login'}
            </button>
            <button
              type="button"
              className="text-sm text-white/60 underline"
              onClick={() => setMode((prev) => (prev === 'register' ? 'login' : 'register'))}
            >
              {mode === 'register' ? 'Need to login?' : 'Need an account?'}
            </button>
          </div>
        </form>
      )}

      {authUser && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20"
          >
            Sign Out
          </button>
          <form className="grid gap-2" onSubmit={handleTokenUpdate}>
            <label htmlFor="update-token" className="text-xs uppercase tracking-wide text-white/60">Update GitHub Token</label>
            <input
              id="update-token"
              type="password"
              value={tokenUpdate}
              onChange={(e) => setTokenUpdate(e.target.value)}
              placeholder="ghp_xxx"
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
            />
            <button
              type="submit"
              disabled={busy || !tokenUpdate}
              className="py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-40"
            >
              Save Token
            </button>
            {error && <p className="text-sm text-rose-300">{error}</p>}
          </form>
        </div>
      )}
    </section>
  );
};

export default AuthPanel;
