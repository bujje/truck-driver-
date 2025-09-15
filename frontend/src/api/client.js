// Axios client configured to work with Django (session/CSRF) via CRA proxy
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE_URL || '/api/';

const client = axios.create({
  baseURL,
  withCredentials: true, // include session cookies when using cookie auth
});

// CSRF handling for Django when using session auth
client.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');
  if (!config.headers) config.headers = {};
  if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;
  return config;
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export default client;