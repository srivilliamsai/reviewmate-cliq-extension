import 'dotenv/config';

export const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required but missing`);
  }
  return value;
};

export const PORT = process.env.PORT || '5001';
export const MONGODB_URI = requireEnv('MONGODB_URI');
export const JWT_SECRET = requireEnv('JWT_SECRET');
export const GITHUB_TOKEN_SECRET = requireEnv('GITHUB_TOKEN_SECRET');
