import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import PRForm from './components/PRForm.jsx';
import PRCard from './components/PRCard.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import FiltersBar from './components/FiltersBar.jsx';
import BatchImportPanel from './components/BatchImportPanel.jsx';
import AnalyticsPanel from './components/AnalyticsPanel.jsx';
import {
  deleteReview,
  fetchPR,
  getAllReviews,
  getAnalytics,
  getStoredAuthToken,
  uploadBatchFile
} from './services/api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '');

const notificationStyles = {
  info: 'bg-white/10 border border-white/20',
  success: 'bg-emerald-500/20 border border-emerald-400/40',
  warning: 'bg-amber-500/20 border border-amber-400/40'
};

const createNotificationId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const App = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    repository: 'all',
    sortBy: 'date',
    sortDir: 'desc'
  });
  const filtersRef = useRef(filters);
  const [authUser, setAuthUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem('reviewmate_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [batchProgress, setBatchProgress] = useState({});
  const socketRef = useRef(null);
  const notificationTimers = useRef([]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const persistUser = (user) => {
    setAuthUser(user);
    if (typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem('reviewmate_user', JSON.stringify(user));
      } else {
        window.localStorage.removeItem('reviewmate_user');
      }
    }
  };

  const addNotification = useCallback((message, variant = 'info') => {
    const id = createNotificationId();
    setNotifications((prev) => [...prev, { id, message, variant }]);
    const timeoutId = setTimeout(() => {
      setNotifications((prev) => prev.filter((note) => note.id !== id));
      notificationTimers.current = notificationTimers.current.filter((timer) => timer !== timeoutId);
    }, 4000);
    notificationTimers.current.push(timeoutId);
  }, []);

  useEffect(() => () => {
    notificationTimers.current.forEach((id) => clearTimeout(id));
    notificationTimers.current = [];
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setAnalytics(null);
      return;
    }
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics', err.message);
    }
  }, []);

  const loadReviews = useCallback(
    async (overrideFilters) => {
      if (!getStoredAuthToken()) {
        setLoading(false);
        setReviews([]);
        setAnalytics(null);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const activeFilters = overrideFilters || filtersRef.current;
        const data = await getAllReviews(activeFilters);
        setReviews(data);
        await fetchAnalytics();
      } catch (err) {
        setError(err?.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    },
    [fetchAnalytics]
  );

  useEffect(() => {
    if (authUser) {
      loadReviews(filters);
    } else {
      setLoading(false);
      setReviews([]);
      setAnalytics(null);
    }
  }, [authUser, filters, loadReviews]);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!authUser || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('review.created', (review) => {
      setReviews((prev) => {
        const filtered = prev.filter((item) => item.prId !== review.prId);
        return [review, ...filtered];
      });
      addNotification(`New review for ${review.repository}`, 'info');
      fetchAnalytics();
    });

    socket.on('review.updated', (review) => {
      setReviews((prev) => {
        const filtered = prev.filter((item) => item.prId !== review.prId);
        return [review, ...filtered];
      });
      addNotification(`Review updated (${review.status})`, 'success');
      fetchAnalytics();
    });

    socket.on('review.deleted', ({ prId }) => {
      setReviews((prev) => prev.filter((item) => item.prId !== prId));
      addNotification('Review removed', 'warning');
      fetchAnalytics();
    });

    socket.on('batch.progress', (payload) => {
      setBatchProgress((prev) => ({
        ...prev,
        [payload.batchId]: {
          ...prev[payload.batchId],
          ...payload,
          updatedAt: Date.now()
        }
      }));
    });

    socket.on('connect_error', (err) => {
      addNotification(`Realtime error: ${err.message}`, 'warning');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authUser, addNotification, fetchAnalytics]);

  const handleFetchPR = async ({ prUrl, githubToken }) => {
    if (!authUser) {
      throw new Error('Please sign in to submit PRs');
    }
    try {
      await fetchPR(prUrl, githubToken);
      loadReviews(filtersRef.current);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch PR';
      throw new Error(message);
    }
  };

  const handleDelete = async (prId) => {
    try {
      await deleteReview(prId);
      setReviews((prev) => prev.filter((item) => item.prId !== prId));
      fetchAnalytics();
    } catch (err) {
      setError(err?.message || 'Failed to delete review');
    }
  };

  const stats = useMemo(() => {
    if (!reviews.length) return { open: 0, closed: 0, merged: 0 };
    return reviews.reduce(
      (acc, review) => {
        acc[review.status] = (acc[review.status] || 0) + 1;
        return acc;
      },
      { open: 0, closed: 0, merged: 0 }
    );
  }, [reviews]);

  const repositoryOptions = useMemo(() => {
    const unique = new Set(reviews.map((review) => review.repository));
    return Array.from(unique).sort();
  }, [reviews]);

  const batchEntries = useMemo(() => {
    return Object.values(batchProgress)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 3);
  }, [batchProgress]);

  const handleAuthSuccess = (user) => {
    persistUser(user);
    loadReviews(filtersRef.current);
  };

  const handleLogout = () => {
    notificationTimers.current.forEach((id) => clearTimeout(id));
    notificationTimers.current = [];
    persistUser(null);
    setReviews([]);
    setAnalytics(null);
    setError('');
    setNotifications([]);
    setBatchProgress({});
  };

  const handleBatchUpload = async (file) => {
    try {
      const result = await uploadBatchFile(file);
      addNotification(`Batch ${result.batchId.slice(0, 6)} queued (${result.total} PRs)`, 'info');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to upload CSV';
      throw new Error(message);
    }
  };

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#0b1120] to-[#111c2f] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <header className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-white/40">ReviewMate</p>
          <h1 className="text-4xl md:text-5xl font-black">
            ReviewMate <span role="img" aria-label="search">🔍</span>
          </h1>
          <p className="text-lg text-white/60">GitHub PR Review Assistant</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <AuthPanel authUser={authUser} onAuthSuccess={handleAuthSuccess} onLogout={handleLogout} />
          <div className="flex flex-col gap-4">
            <PRForm onSubmit={handleFetchPR} disabled={!authUser} />
            {!authUser && <p className="text-sm text-amber-300">Sign in or register to submit PRs.</p>}
          </div>
        </section>

        <FiltersBar filters={filters} onChange={handleFilterChange} repositoryOptions={repositoryOptions} />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['open', 'merged', 'closed'].map((status) => (
            <div key={status} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="uppercase text-xs tracking-wide text-white/50">{status}</p>
              <p className="text-3xl font-bold mt-2">{stats[status] || 0}</p>
            </div>
          ))}
        </section>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-100 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Pull Requests</h2>
            <button
              type="button"
              onClick={() => loadReviews(filtersRef.current)}
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-100"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-white/60">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-white/50">No reviews yet. Submit a PR to get started.</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <PRCard key={review.prId} prData={review} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <BatchImportPanel onUpload={handleBatchUpload} progressEntries={batchEntries} />
          <AnalyticsPanel analytics={analytics} />
        </section>
      </div>

      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 w-72 space-y-3">
          {notifications.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-xl shadow-lg text-sm text-white ${notificationStyles[note.variant] || notificationStyles.info}`}
            >
              {note.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
