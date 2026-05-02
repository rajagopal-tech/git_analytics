import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://gitanalytics-production.up.railway.app';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

export const analyzeRepos = (repoUrls, timezone = 'Asia/Kolkata', forceRefresh = false) =>
  api.post('/analyze', { repoUrls, timezone, forceRefresh }).then(r => r.data);

export const getAllResults = () =>
  api.get('/results').then(r => r.data);

export const getRepoResult = (repoName) =>
  api.get(`/results/${repoName}`).then(r => r.data);

export const deleteRepoResult = (repoName) =>
  api.delete(`/results/${repoName}`).then(r => r.data);

export const getSummary = () =>
  api.get('/summary').then(r => r.data);

export const getClones = () =>
  api.get('/clones').then(r => r.data);

export const deleteClone = (repoName) =>
  api.delete(`/clones/${repoName}`).then(r => r.data);

export const clearAllClones = () =>
  api.delete('/clones').then(r => r.data);

// Feature 2: Compare repos
export const compareRepos = (repoNames) =>
  api.post('/compare', { repoNames }).then(r => r.data);

// Feature 3: History
export const getRepoHistory = (repoName) =>
  api.get(`/history/${repoName}`).then(r => r.data);

export default api;
