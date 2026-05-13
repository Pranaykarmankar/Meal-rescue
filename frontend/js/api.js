/**
 * Meal-Rescue — Central API Fetch Wrapper
 * Handles JWT auto-attach, 401 refresh, error toasts.
 */

const API_BASE = '/api';

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, null);
    return true;
  } catch {
    return false;
  }
}

async function request(method, url, body = null, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    let res = await fetch(`${API_BASE}${url}`, options);

    // On 401, try refreshing the token once (except for login/register)
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (res.status === 401 && retry && !isAuthRoute) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request(method, url, body, false);
      } else {
        clearTokens();
        if (!window.location.pathname.includes('auth') && window.location.pathname !== '/') {
          window.location.href = '/auth';
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Something went wrong');
    }

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      showToast('No internet connection.', 'error');
      throw new Error('Network error');
    }
    throw err;
  }
}

// Convenience methods
const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

// Upload file helper
async function uploadFile(url, file, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers = {};
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
}

// Require auth helper
function requireAuth() {
  const token = getAccessToken();
  if (!token) {
    window.location.href = '/auth';
    return false;
  }
  return true;
}
