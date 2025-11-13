import express from 'express';
import https from 'node:https';
import { body, validationResult } from 'express-validator';

import Review from '../models/review.js';
import { decryptToken, encryptToken } from '../utils/tokenVault.js';
import { emitReviewEvent } from '../realtime/socket.js';
import { sendStatusChangeEmail } from '../services/email.js';

const router = express.Router();

export const PR_URL_REGEX = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

const derivePriority = (linesChanged) => {
  if (linesChanged >= 200) return 'High';
  if (linesChanged >= 50) return 'Medium';
  return 'Low';
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const firstMessage = details[0]?.msg || 'Validation failed';
    return res.status(400).json({ message: firstMessage, errors: details });
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

const fetchPullRequest = ({ owner, repo, prNumber, token }) =>
  new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'ReviewMate-Backend'
        }
      },
      (response) => {
        let rawData = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          rawData += chunk;
        });
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(rawData ? JSON.parse(rawData) : {});
            } catch (error) {
              reject(buildError('GitHub API call failed', 502, 'Invalid JSON response from GitHub'));
            }
            return;
          }

          let errorMessage;
          try {
            errorMessage = rawData ? JSON.parse(rawData).message : undefined;
          } catch (parseError) {
            errorMessage = rawData || (parseError instanceof Error ? parseError.message : 'Unknown error');
          }
          reject(buildError('GitHub API call failed', response.statusCode || 500, errorMessage));
        });
      }
    );

    request.on('error', (error) => {
      reject(buildError(error.message || 'Failed to connect to GitHub', 503));
    });

    request.end();
  });

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
    const prData = await fetchPullRequest({ owner, repo, prNumber, token: tokenToUse });
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
    if (error?.status === 503) {
      const existing = await Review.findOne(filter);
      if (existing) {
        return { review: existing, action: 'unchanged' };
      }
    }
    if (error?.status) {
      throw error;
    }
    throw buildError('GitHub API call failed', 500, error instanceof Error ? error.message : undefined);
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
      .withMessage('Invalid GitHub PR URL'),
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
      } else {
        console.warn('Fetch PR request failed:', status, error.message);
      }
      return res.status(status).json(payload);
    }
  }
);

export default router;
