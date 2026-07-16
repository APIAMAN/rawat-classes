import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearError } from '../store/authSlice';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { status, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      toast.success(`Welcome back, ${user?.username || 'user'}!`);
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, user, toast]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      dispatch(loginUser({ username, password }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-extrabold text-white tracking-tight font-heading text-center">Account Sign In</h3>
        <p className="text-slate-400 text-xs text-center mt-1">Enter your assigned username & password</p>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex items-start gap-2.5">
          <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs text-rose-200 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1 font-heading">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-base w-full"
            placeholder="Enter username"
            disabled={status === 'loading'}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1 font-heading">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base w-full"
            placeholder="••••••••"
            disabled={status === 'loading'}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <>
            <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign In to Portal</span>
        )}
      </button>
    </form>
  );
};

export default Login;
