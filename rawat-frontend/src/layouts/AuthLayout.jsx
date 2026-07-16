import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AuthLayout = () => {
  const { isAuthenticated, status } = useSelector((state) => state.auth);

  // If already authenticated and done checking, redirect to dashboard/home
  if (isAuthenticated && status !== 'loading') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 -z-10" />
      <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] -z-10 animate-pulse duration-[8s]" />
      <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-violet-600/10 blur-[120px] -z-10 animate-pulse duration-[12s]" />

      <div className="w-full max-w-md px-6 py-12">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-800/80 shadow-2xl shadow-slate-950/50">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
              <span className="text-white text-3xl font-extrabold tracking-tight">R</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Rawat Classes</h2>
            <p className="text-slate-400 text-sm mt-1">Management Portal</p>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
