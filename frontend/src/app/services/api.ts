import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// One refresh attempt shared across concurrent 401s so a burst of
// failing requests doesn't fire a refresh call each.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await axios.post('/api/auth/refresh/', { refresh_token: refreshToken });
    const data = res.data?.data;
    if (!data?.access_token) return null;
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// On 401, refresh the access token once and retry; otherwise sign out.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
      console.warn('API auth failed - JWT token missing or expired');
      redirectToLogin();
    }
    return Promise.reject(err);
  }
);

export default api;
