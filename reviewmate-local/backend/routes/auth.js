import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';

import User from '../models/user.js';
import { encryptToken } from '../utils/tokenVault.js';
import { signAuthToken } from '../utils/jwt.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const validators = (checks) => [
  ...checks,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  }
];

router.post(
  '/register',
  validators([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('githubToken').isString().notEmpty().withMessage('GitHub token is required')
  ]),
  async (req, res) => {
    const { email, password, githubToken } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const githubTokenEncrypted = encryptToken(githubToken.trim());

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      githubToken: githubTokenEncrypted
    });

    const token = signAuthToken(user);
    return res.status(201).json({ token, user: user.toSafeObject() });
  }
);

router.post(
  '/login',
  validators([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isString().notEmpty().withMessage('Password required')
  ]),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAuthToken(user);
    return res.json({ token, user: user.toSafeObject() });
  }
);

router.put(
  '/token',
  authMiddleware,
  validators([
    body('githubToken').isString().notEmpty().withMessage('GitHub token is required')
  ]),
  async (req, res) => {
    const { githubToken } = req.body;
    req.user.githubToken = encryptToken(githubToken.trim());
    await req.user.save();
    return res.json({ message: 'GitHub token updated' });
  }
);

export default router;
