import express from 'express';
import axios from 'axios';
import { body, validationResult } from 'express-validator';

import Review from '../models/review.js';
import { decryptToken, encryptToken } from '../utils/tokenVault.js';
import { emitReviewEvent } from '../realtime/socket.js';
import { sendStatusChangeEmail } from '../services/email.js';

const router = express.Router();

export const PR_URL_REGEX = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

const derivePriority = (linesChanged) => {
  if (linesChanged > 400) return 'High';
  if (linesChanged > 100) return 'Medium';
  return 'Low';
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

const buildError = (message, status = 400, details) => {
  const error = new Error(message);
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
};

const resolveGithubToken = async (user, overrideToken) => {
  if (overrideToken) {
    const trimmed = overrideToken.trim();
    user.githubToken = encryptToken(trimmed);
    await user.save();
    return trimmed;
  }

  const stored = decryptToken(user.githubToken);
  if (!stored) {
    throw buildError('GitHub token not configured for this user');
  }
  return stored;
};

export const upsertPullRequest = async ({ user, prUrl, githubTokenOverride }) => {
  const matches = prUrl.match(PR_URL_REGEX);
  if (!matches) {
    throw buildError('Invalid GitHub PR URL. Expected https://github.com/<owner>/<repo>/pull/<number>');
  }

  const [, owner, repo, prNumber] = matches;
  const prId = `${owner}/${repo}#${prNumber}`;
  const filter = { prId, user: user._id };

  const tokenToUse = await resolveGithubToken(user, githubTokenOverride);

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${tokenToUse}`,
          'User-Agent': 'ReviewMate-Backend'
        }
      }
    );

    const prData = response.data;
    const linesChanged = (prData.additions || 0) + (prData.deletions || 0);
    const reviewPayload = {
      author: prData.user?.login || 'unknown',
      filesChanged: prData.changed_files || 0,
      linesChanged,
      prId,
      prNumber: Number(prNumber),
      priority: derivePriority(linesChanged),
      prUrl,
      status: prData.merged_at ? 'merged' : prData.state === 'closed' ? 'closed' : 'open',
      repository: `${owner}/${repo}`,
      title: prData.title || 'Untitled PR',
      additions: prData.additions || 0,
      deletions: prData.deletions || 0,
      description: prData.body || '',
      createdAt: new Date(prData.created_at)
    };

    const existing = await Review.findOne(filter);
    if (existing) {
      const previousStatus = existing.status;
      const review = await Review.findOneAndUpdate(filter, reviewPayload, { new: true });
      if (previousStatus !== review.status) {
        await sendStatusChangeEmail({ user, review }).catch(() => {});
        review.lastStatusNotified = review.status;
        await review.save();
      }
      emitReviewEvent(user._id, 'review.updated', review);
      return { review, action: 'updated' };
    }

    const review = await Review.create({
      ...reviewPayload,
      user: user._id,
      lastStatusNotified: reviewPayload.status
    });
    emitReviewEvent(user._id, 'review.created', review);
    return { review, action: 'created' };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw buildError('GitHub API call failed', error.response.status, error.response.data?.message || 'Unknown error');
    }
    throw error;
  }
};

router.post(
  '/fetch-pr',
  [
    body('prUrl')
      .isString()
      .notEmpty()
      .withMessage('prUrl is required')
      .matches(PR_URL_REGEX)
      .withMessage('Provide a valid GitHub PR URL'),
    body('githubToken')
      .optional()
      .isString()
      .withMessage('githubToken must be a string')
  ],
  validate,
  async (req, res) => {
    const { prUrl, githubToken } = req.body;

    try {
      const { review, action } = await upsertPullRequest({
        user: req.user,
        prUrl,
        githubTokenOverride: githubToken
      });
      const statusCode = action === 'created' ? 201 : 200;
      return res.status(statusCode).json(review);
    } catch (error) {
      const status = error.status || 500;
      const payload = { message: error.message || 'Internal server error' };
      if (error.details) {
        payload.details = error.details;
      }
      if (status === 500) {
        console.error('Unexpected error while fetching PR:', error.message);
      }
      return res.status(status).json(payload);
    }
  }
);

export default router;
