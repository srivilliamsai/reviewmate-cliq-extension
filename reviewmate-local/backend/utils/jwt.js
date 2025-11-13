import jwt from 'jsonwebtoken';

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

export const signAuthToken = (user) => {
  const secret = getSecret();
  return jwt.sign({ sub: user._id.toString(), email: user.email }, secret, { expiresIn: '12h' });
};

export const verifyAuthToken = (token) => {
  const secret = getSecret();
  return jwt.verify(token, secret);
};
