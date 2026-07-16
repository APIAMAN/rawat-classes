import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client, { setLocalAccessToken } from '../api/client';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await client.post('auth/login/', credentials);
      setLocalAccessToken(response.data.access);
      return response.data; // response contains { access, user: { id, username, email, role } }
    } catch (error) {
      return rejectWithValue(error.response?.data || { detail: 'An error occurred during login' });
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await client.post('auth/logout/');
      setLocalAccessToken(null);
      return null;
    } catch (error) {
      setLocalAccessToken(null);
      return rejectWithValue(error.response?.data || { detail: 'An error occurred during logout' });
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/check',
  async (_, { rejectWithValue }) => {
    try {
      // First attempt to get a new access token via refresh token httpOnly cookie
      const refreshResponse = await client.post('auth/refresh/', {});
      const accessToken = refreshResponse.data.access;
      setLocalAccessToken(accessToken);

      // Then fetch current user profile info
      const userResponse = await client.get('auth/me/');
      return {
        access: accessToken,
        user: userResponse.data,
      };
    } catch (error) {
      setLocalAccessToken(null);
      return rejectWithValue(error.response?.data || { detail: 'Session expired' });
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.detail || 'Invalid username or password';
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle';
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle';
      })
      // checkAuth
      .addCase(checkAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.status = 'failed';
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
