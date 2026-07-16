import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, status } = useSelector((state) => state.auth);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-400 font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white px-4">
        <div className="max-w-md text-center p-8 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl">
          <svg className="w-16 h-16 text-rose-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6h.01M5.071 19a9 9 0 1113.858 0L5.07 19z" />
          </svg>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You do not have the required permissions to view this page. Role required: {allowedRoles.join(' or ')}.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 transition duration-150 text-white font-semibold rounded-xl"
          >
            Go back
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
