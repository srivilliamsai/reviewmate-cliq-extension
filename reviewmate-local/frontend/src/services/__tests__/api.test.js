import {
  deleteReview,
  fetchPR,
  getAllReviews,
  getAnalytics,
  getStoredAuthToken,
  loginUser,
  registerUser,
  setStoredAuthToken,
  updateGithubToken,
  uploadBatchFile
} from '../api.js';

const mockClient = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn()
    }
  }
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient)
  }
}));

describe('API client helpers', () => {
  beforeEach(() => {
    mockClient.post.mockReset();
    mockClient.get.mockReset();
    mockClient.delete.mockReset();
    mockClient.put.mockReset();
    window.localStorage.clear();
    setStoredAuthToken('');
  });

  it('fetchPR calls POST with PR payload', async () => {
    const response = { data: { prId: 'org/repo#1' } };
    mockClient.post.mockResolvedValue(response);

    const data = await fetchPR('url', 'token');
    expect(mockClient.post).toHaveBeenCalledWith('/github/fetch-pr', {
      prUrl: 'url',
      githubToken: 'token'
    });
    expect(data).toEqual(response.data);
  });

  it('getAllReviews calls GET /reviews', async () => {
    mockClient.get.mockResolvedValue({ data: [1, 2] });
    const data = await getAllReviews();
    expect(mockClient.get).toHaveBeenCalledWith('/reviews');
    expect(data).toEqual([1, 2]);
  });

  it('deleteReview calls DELETE endpoint', async () => {
    mockClient.delete.mockResolvedValue({ data: { ok: true } });
    const data = await deleteReview('org/repo#1');
    expect(mockClient.delete).toHaveBeenCalledWith('/reviews/org%2Frepo%231');
    expect(data).toEqual({ ok: true });
  });

  it('registerUser stores auth token', async () => {
    mockClient.post.mockResolvedValue({ data: { token: 'abc123', user: { email: 'user@test.com' } } });
    await registerUser({ email: 'user@test.com', password: 'Pass1234!', githubToken: 'ghp' });
    expect(window.localStorage.getItem('reviewmate_jwt')).toBe('abc123');
  });

  it('loginUser stores auth token', async () => {
    mockClient.post.mockResolvedValue({ data: { token: 'xyz789', user: { email: 'user@test.com' } } });
    await loginUser({ email: 'user@test.com', password: 'Pass1234!' });
    expect(getStoredAuthToken()).toBe('xyz789');
  });

  it('updateGithubToken calls PUT endpoint', async () => {
    mockClient.put.mockResolvedValue({ data: { message: 'GitHub token updated' } });
    const data = await updateGithubToken({ githubToken: 'ghp_new' });
    expect(mockClient.put).toHaveBeenCalledWith('/auth/token', { githubToken: 'ghp_new' });
    expect(data).toEqual({ message: 'GitHub token updated' });
  });

  it('uploadBatchFile posts multipart form data', async () => {
    mockClient.post.mockResolvedValue({ data: { batchId: 'batch-1' } });
    const file = new Blob(['https://github.com/org/repo/pull/1'], { type: 'text/csv' });
    const data = await uploadBatchFile(file);
    expect(mockClient.post).toHaveBeenCalled();
    expect(data).toEqual({ batchId: 'batch-1' });
  });

  it('getAnalytics fetches analytics payload', async () => {
    mockClient.get.mockResolvedValue({ data: { statusCounts: {} } });
    const data = await getAnalytics();
    expect(mockClient.get).toHaveBeenCalledWith('/reviews/analytics');
    expect(data).toEqual({ statusCounts: {} });
  });
});
