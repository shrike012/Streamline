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
});

instance.interceptors.request.use((config) => {
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

export default instance;
