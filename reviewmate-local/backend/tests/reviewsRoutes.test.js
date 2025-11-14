import request from 'supertest';

import createApp from '../app.js';
import Review from '../models/review.js';

const app = createApp();

let authToken;
let userId;

const registerUser = async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'reviewer@example.com',
      password: 'Password123!',
      githubToken: 'ghp_token'
    });
  authToken = res.body.token;
  userId = res.body.user.id;
};

describe('Review routes', () => {
  beforeEach(async () => {
    await registerUser();
    await Review.create({
      author: 'test-user',
      filesChanged: 3,
      linesChanged: 42,
      prId: 'org/repo#1',
      prNumber: 1,
      priority: 'Medium',
      prUrl: 'https://github.com/org/repo/pull/1',
      status: 'open',
      repository: 'org/repo',
      title: 'Sample',
      additions: 30,
      deletions: 12,
      description: 'Sample description',
      user: userId
    });
  });

  it('lists reviews', async () => {
    const res = await request(app)
      .get('/api/reviews')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].prId).toBe('org/repo#1');
  });

  it('fetches review by id', async () => {
    const res = await request(app)
      .get(`/api/reviews/org/${encodeURIComponent('repo#1')}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body.title).toBe('Sample');
  });

  it('returns 404 for missing review', async () => {
    await request(app)
      .get(`/api/reviews/org/${encodeURIComponent('repo#999')}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('deletes review by id', async () => {
    await request(app)
      .delete(`/api/reviews/org/${encodeURIComponent('repo#1')}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const remaining = await Review.find();
    expect(remaining).toHaveLength(0);
  });
});
