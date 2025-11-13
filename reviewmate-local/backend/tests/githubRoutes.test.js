import request from 'supertest';
import nock from 'nock';

import createApp from '../app.js';
import Review from '../models/review.js';

const app = createApp();

const mockPR = {
  url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
  id: 1,
  number: 1347,
  state: 'open',
  title: 'Add new feature',
  body: 'Implements the feature description',
  user: { login: 'octocat' },
  created_at: '2024-01-01T00:00:00Z',
  merged_at: null,
  additions: 200,
  deletions: 50,
  changed_files: 5
};

const githubScope = () =>
  nock('https://api.github.com')
    .get('/repos/octocat/Hello-World/pulls/1347')
    .reply(200, mockPR);

let authToken;
let userId;

const registerUser = async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: 'Password123!',
      githubToken: 'ghp_mocktoken'
    });
  authToken = res.body.token;
  userId = res.body.user.id;
};

describe('POST /api/github/fetch-pr', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(async () => {
    await registerUser();
  });

  it('saves PR data and returns formatted payload', async () => {
    githubScope();

    const res = await request(app)
      .post('/api/github/fetch-pr')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prUrl: 'https://github.com/octocat/Hello-World/pull/1347',
        githubToken: 'fake'
      })
      .expect(201);

    expect(res.body).toMatchObject({
      author: 'octocat',
      filesChanged: 5,
      linesChanged: 250,
      prId: 'octocat/Hello-World#1347',
      priority: 'High',
      status: 'open'
    });

    const inDb = await Review.findOne({ prId: 'octocat/Hello-World#1347', user: userId });
    expect(inDb).not.toBeNull();
  });

  it('rejects invalid URLs', async () => {
    const res = await request(app)
      .post('/api/github/fetch-pr')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prUrl: 'https://example.com/not-a-pr' })
      .expect(400);

    expect(res.body.message).toMatch(/Invalid GitHub PR URL/i);
  });

  it('handles GitHub API failures', async () => {
    nock('https://api.github.com')
      .get('/repos/octocat/Hello-World/pulls/1')
      .reply(404, { message: 'Not Found' });

    const res = await request(app)
      .post('/api/github/fetch-pr')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prUrl: 'https://github.com/octocat/Hello-World/pull/1' })
      .expect(404);

    expect(res.body).toMatchObject({ message: 'GitHub API call failed' });
  });

  it('updates existing record on duplicate PR', async () => {
    await Review.create({
      author: 'octocat',
      filesChanged: 1,
      linesChanged: 10,
      prId: 'octocat/Hello-World#10',
      prNumber: 10,
      priority: 'Low',
      prUrl: 'https://github.com/octocat/Hello-World/pull/10',
      status: 'open',
      repository: 'octocat/Hello-World',
      title: 'Existing',
      additions: 5,
      deletions: 5,
      description: 'Existing',
      createdAt: new Date(),
      user: userId
    });

    const res = await request(app)
      .post('/api/github/fetch-pr')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prUrl: 'https://github.com/octocat/Hello-World/pull/10' })
      .expect(200);

    expect(res.body.prId).toBe('octocat/Hello-World#10');
  });
});
