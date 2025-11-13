import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { deleteReview, fetchPR, getAllReviews, getAnalytics, getStoredAuthToken } from '../services/api.js';

const mockSocket = {
  on: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  disconnect: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

vi.mock('../services/api.js', () => ({
  fetchPR: vi.fn(),
  getAllReviews: vi.fn(),
  getAnalytics: vi.fn(),
  deleteReview: vi.fn(),
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  updateGithubToken: vi.fn(),
  setStoredAuthToken: vi.fn(),
  getStoredAuthToken: vi.fn(),
  uploadBatchFile: vi.fn()
}));

describe('App integration states', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    getStoredAuthToken.mockReturnValue('token');
    window.localStorage.setItem('reviewmate_user', JSON.stringify({ email: 'user@example.com' }));
    mockSocket.on.mockReset();
    mockSocket.on.mockReturnThis();
    mockSocket.disconnect.mockReset();
    getAnalytics.mockResolvedValue({
      statusCounts: { open: 0, closed: 0, merged: 0 },
      averageReviewTimeHours: 0,
      repositoryActivity: [],
      topContributors: []
    });
  });

  it('shows loading indicator while fetching reviews', async () => {
    let resolver;
    const pending = new Promise((resolve) => {
      resolver = resolve;
    });
    getAllReviews.mockReturnValueOnce(pending);

    render(<App />);
    expect(screen.getByText(/Loading reviews/i)).toBeInTheDocument();

    resolver([]);
    await waitFor(() => expect(getAllReviews).toHaveBeenCalled());
  });

  it('renders error state when fetch fails', async () => {
    getAllReviews.mockRejectedValueOnce(new Error('boom'));

    render(<App />);

    expect(await screen.findByText(/Failed to load reviews/i)).toBeInTheDocument();
  });

  it('adds a PR card after successful submission', async () => {
    const user = userEvent.setup();
    getAllReviews.mockResolvedValueOnce([]);
    fetchPR.mockResolvedValueOnce({
      prId: 'org/repo#1',
      repository: 'org/repo',
      prNumber: 1,
      title: 'New PR',
      status: 'open',
      priority: 'Low',
      author: 'octocat',
      filesChanged: 1,
      additions: 1,
      deletions: 0,
      description: 'desc'
    });

    render(<App />);

    await user.type(screen.getByLabelText(/PR URL/i), 'https://github.com/org/repo/pull/1');
    await user.click(screen.getByRole('button', { name: /fetch/i }));

    await waitFor(() => expect(fetchPR).toHaveBeenCalled());
    expect(await screen.findByText(/New PR/)).toBeInTheDocument();
  });

  it('shows error when delete fails', async () => {
    const user = userEvent.setup();
    getAllReviews.mockResolvedValueOnce([
      {
        prId: 'org/repo#1',
        repository: 'org/repo',
        prNumber: 1,
        title: 'Existing',
        status: 'open',
        priority: 'Low',
        author: 'octocat',
        filesChanged: 1,
        additions: 1,
        deletions: 0,
        description: 'desc'
      }
    ]);
    deleteReview.mockRejectedValueOnce(new Error('delete failed'));

    render(<App />);

    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(await screen.findByText(/delete review/i)).toBeInTheDocument();
  });
});
