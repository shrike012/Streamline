import axios from "axios";

const instance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 10000,
});

instance.interceptors.request.use((config) => {
  const csrfToken = (() => {
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
  })();

  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
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
      const hasRefreshToken = document.cookie.includes("refresh_token=");
      if (!hasRefreshToken) {
        return Promise.reject(error); // don't try refresh
      }

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
        return instance(originalRequest);
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
