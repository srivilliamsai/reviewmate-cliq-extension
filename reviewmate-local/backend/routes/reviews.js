import express from 'express';
import { param, validationResult } from 'express-validator';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';

import Review from '../models/review.js';
import { emitReviewEvent } from '../realtime/socket.js';
import { upsertPullRequest, PR_URL_REGEX } from './github.js';

const router = express.Router();
const upload = multer();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

const buildQueryFilters = (userId, query) => {
  const filters = { user: userId };
  if (query.status && query.status !== 'all') {
    filters.status = query.status;
  }
  if (query.priority && query.priority !== 'all') {
    filters.priority = query.priority;
  }
  if (query.repository && query.repository !== 'all') {
    filters.repository = query.repository;
  }
  return filters;
};

const buildSort = (sortBy = 'date', sortDir = 'desc') => {
  const direction = sortDir === 'asc' ? 1 : -1;
  switch (sortBy) {
    case 'lines':
      return { linesChanged: direction };
    case 'files':
      return { filesChanged: direction };
    default:
      return { createdAt: direction };
  }
};

router.get('/', async (req, res) => {
  try {
    const filters = buildQueryFilters(req.user._id, req.query);
    const sort = buildSort(req.query.sortBy, req.query.sortDir);
    const reviews = await Review.find(filters).sort(sort);
    return res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id });
    const statusCounts = reviews.reduce(
      (acc, review) => {
        acc[review.status] = (acc[review.status] || 0) + 1;
        return acc;
      },
      { open: 0, closed: 0, merged: 0 }
    );

    const completed = reviews.filter((review) => ['closed', 'merged'].includes(review.status) && review.updatedAt);
    const totalDuration = completed.reduce((acc, review) => acc + (new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime()), 0);
    const averageReviewTimeHours = completed.length ? Number((totalDuration / completed.length / (1000 * 60 * 60)).toFixed(2)) : 0;

    const repositoryActivityMap = reviews.reduce((acc, review) => {
      acc[review.repository] = (acc[review.repository] || 0) + 1;
      return acc;
    }, {});
    const repositoryActivity = Object.entries(repositoryActivityMap)
      .map(([repo, count]) => ({ repo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const contributorMap = reviews.reduce((acc, review) => {
      acc[review.author] = (acc[review.author] || 0) + 1;
      return acc;
    }, {});
    const topContributors = Object.entries(contributorMap)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({ statusCounts, averageReviewTimeHours, repositoryActivity, topContributors });
  } catch (error) {
    console.error('Failed to build analytics:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/batch', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  let records;
  try {
    records = parse(req.file.buffer.toString('utf8'), { skip_empty_lines: true });
  } catch (error) {
    return res.status(400).json({ message: 'Unable to parse CSV file' });
  }

  const prUrls = records
    .flat()
    .map((cell) => cell.trim())
    .filter((cell) => cell && PR_URL_REGEX.test(cell));

  if (!prUrls.length) {
    return res.status(400).json({ message: 'No valid PR URLs found in CSV' });
  }

  const batchId = randomUUID();
  const total = prUrls.length;
  const currentUser = req.user;
  const userId = req.user._id;

  const emitProgress = (data) => {
    emitReviewEvent(userId, 'batch.progress', {
      batchId,
      total,
      ...data
    });
  };

  emitProgress({ status: 'started', processed: 0, successes: 0, failures: 0 });

  const processBatch = async () => {
    let processed = 0;
    let successes = 0;
    let failures = 0;

    for (const prUrl of prUrls) {
      try {
        await upsertPullRequest({ user: currentUser, prUrl });
        successes += 1;
        emitProgress({
          status: 'in_progress',
          processed: ++processed,
          successes,
          failures,
          lastResult: { prUrl, status: 'success' }
        });
      } catch (error) {
        failures += 1;
        processed += 1;
        emitProgress({
          status: 'in_progress',
          processed,
          successes,
          failures,
          lastResult: {
            prUrl,
            status: 'error',
            message: error.message || 'Unknown error'
          }
        });
      }
    }

    emitProgress({ status: 'completed', processed, successes, failures });
  };

  setImmediate(() => {
    processBatch().catch((error) => {
      console.error('Batch import failed:', error.message);
      emitProgress({ status: 'failed', processed: 0, successes: 0, failures: total, message: error.message });
    });
  });

  return res.status(202).json({ batchId, total });
});

router.get(
  '/:prId',
  [param('prId').isString().notEmpty().withMessage('prId is required')],
  handleValidation,
  async (req, res) => {
    try {
      const review = await Review.findOne({ prId: req.params.prId, user: req.user._id });
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      return res.json(review);
    } catch (error) {
      console.error('Failed to fetch review:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.delete(
  '/:prId',
  [param('prId').isString().notEmpty().withMessage('prId is required')],
  handleValidation,
  async (req, res) => {
    try {
      const result = await Review.findOneAndDelete({ prId: req.params.prId, user: req.user._id });
      if (!result) {
        return res.status(404).json({ message: 'Review not found' });
      }
      emitReviewEvent(req.user._id, 'review.deleted', { prId: req.params.prId });
      return res.json({ message: 'Review deleted', prId: req.params.prId });
    } catch (error) {
      console.error('Failed to delete review:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;
