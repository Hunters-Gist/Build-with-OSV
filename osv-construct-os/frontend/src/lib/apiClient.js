import axios from 'axios';
import {
  getApiBaseUrl,
  readAccessToken,
  isAuthError,
  clearKnownTokens,
  resetSessionCache
} from '../auth/session';

let authFailureHandler = null;
let authFailureDebounce = false;

export function setApiAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === 'function' ? handler : null;
}

function triggerAuthFailure(error) {
  clearKnownTokens();
  resetSessionCache();

  if (authFailureDebounce) return;
  authFailureDebounce = true;
  window.setTimeout(() => {
    authFailureDebounce = false;
  }, 250);

  if (authFailureHandler) {
    authFailureHandler(error);
  }
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl()
});

apiClient.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (!token) return config;

  const nextConfig = { ...config };
  nextConfig.headers = {
    ...(nextConfig.headers || {}),
    Authorization: `Bearer ${token}`
  };
  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAuthError(error)) {
      triggerAuthFailure(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
