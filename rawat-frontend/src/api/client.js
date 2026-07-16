import axios from 'axios';

let accessToken = null;

export const setLocalAccessToken = (token) => {
  accessToken = token;
};

export const getLocalAccessToken = () => {
  return accessToken;
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with cross-origin requests
});

// Request interceptor to attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = getLocalAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors (e.g., token expiration)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we receive a 401 and have not retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Request new access token using httpOnly refresh token cookie
        const response = await axios.post(
          `${client.defaults.baseURL}auth/refresh/`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = response.data.access;
        setLocalAccessToken(newAccessToken);
        
        // Retry the original request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        setLocalAccessToken(null);
        // Dispatch logout event or handle in component layer
      }
    }
    return Promise.reject(error);
  }
);

export default client;

