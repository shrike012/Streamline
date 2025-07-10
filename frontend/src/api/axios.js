import axios from "axios";

// Extract the csrf_token from cookies
function getCSRFToken() {
  const name = "csrf_token=";
  const decoded = decodeURIComponent(document.cookie);
  const cookies = decoded.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name)) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

const instance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor to add CSRF token
instance.interceptors.request.use((config) => {
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

// Response interceptor to refresh token on 401
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry login/signup or already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/signup")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => instance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        await instance.post("/auth/refresh-token");
        processQueue(null);
        return instance(originalRequest); // Retry original request
      } catch (refreshError) {
        processQueue(refreshError);
        const current = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(current)}`;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
