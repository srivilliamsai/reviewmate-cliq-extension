import nodemailer from 'nodemailer';
import cron from 'node-cron';

import User from '../models/user.js';
import Review from '../models/review.js';

let transporter;

const emailConfigAvailable = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

const getTransporter = () => {
  if (!emailConfigAvailable()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporter;
};

export const sendStatusChangeEmail = async ({ user, review }) => {
  const client = getTransporter();
  if (!client) return;

  const subject = `[ReviewMate] ${review.repository} #${review.prNumber} is ${review.status}`;
  const body = `Hi ${user.email},\n\n` +
    `The pull request ${review.prId} is now ${review.status}.\n` +
    `Title: ${review.title}\n` +
    `Files changed: ${review.filesChanged}\n` +
    `Lines changed: ${review.linesChanged}\n\n` +
    `View PR: ${review.prUrl}\n\n` +
    `– ReviewMate`;

  await client.sendMail({
    to: user.email,
    from: process.env.SMTP_FROM,
    subject,
    text: body
  });
};

const buildDigestBody = (reviews) => {
  const lines = reviews.map((review) => {
    const ageHours = Math.round((Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60));
    return `• ${review.repository} #${review.prNumber} (${review.priority}) — ${ageHours}h old\n   ${review.prUrl}`;
  });

  return `Here are your pending pull requests:\n\n${lines.join('\n\n')}\n\nKeep the reviews flowing!`;
};

export const sendDailyDigestEmails = async () => {
  const client = getTransporter();
  if (!client) return;

  const users = await User.find();
  for (const user of users) {
    const pendingReviews = await Review.find({ user: user._id, status: 'open' }).sort({ createdAt: 1 }).limit(50);
    if (!pendingReviews.length) continue;

    await client.sendMail({
      to: user.email,
      from: process.env.SMTP_FROM,
      subject: `[ReviewMate] Pending reviews (${pendingReviews.length})`,
      text: buildDigestBody(pendingReviews)
    });
  }
};

export const scheduleDailyDigest = () => {
  if (!emailConfigAvailable()) {
    return;
  }

  const cronExpression = process.env.DIGEST_CRON || '0 9 * * *';
  cron.schedule(cronExpression, () => {
    sendDailyDigestEmails().catch((err) => {
      console.error('Failed to send daily digest:', err.message);
    });
  });
};
