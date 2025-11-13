import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const TOKEN_STORAGE_KEY = 'reviewmate_jwt';

const isBrowser = typeof window !== 'undefined';
let authToken = isBrowser ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : '';

const client = axios.create({
  baseURL: API_BASE_URL
});

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const setStoredAuthToken = (token) => {
  authToken = token || '';
  if (isBrowser) {
    if (authToken) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
};

export const getStoredAuthToken = () => authToken;

export const fetchPR = async (prUrl, githubToken) => {
  const { data } = await client.post('/github/fetch-pr', {
    prUrl,
    githubToken
  });
  return data;
};

export const getAllReviews = async (filters = {}) => {
  const { data } = await client.get('/reviews', { params: filters });
  return data;
};

export const deleteReview = async (prId) => {
  const { data } = await client.delete(`/reviews/${encodeURIComponent(prId)}`);
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await client.post('/auth/register', payload);
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await client.post('/auth/login', payload);
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
};

export const updateGithubToken = async (payload) => {
  const { data } = await client.put('/auth/token', payload);
  return data;
};

export const uploadBatchFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/reviews/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const getAnalytics = async () => {
  const { data } = await client.get('/reviews/analytics');
  return data;
};
