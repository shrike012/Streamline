import axios from 'axios';

// Extract the csrf_token from cookies
function getCSRFToken() {
  const name = "csrf_token=";
  const decoded = decodeURIComponent(document.cookie);
  const cookies = decoded.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name)) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

const instance = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true, // Send cookies with requests
});

instance.interceptors.request.use((config) => {
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

export default instance;