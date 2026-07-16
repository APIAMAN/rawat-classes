import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import saraswatiImg from '../assets/saraswati.jpg';

const AuthLayout = () => {
  const { isAuthenticated, status } = useSelector((state) => state.auth);

  if (isAuthenticated && status !== 'loading') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#070a12] overflow-hidden font-sans p-4 md:p-6">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="w-full max-w-4xl max-h-[calc(100vh-2rem)] bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: SaaS Hero Showcase Banner */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Platform Tag */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl overflow-hidden shadow-lg border border-amber-400/40 shrink-0">
                <img src={saraswatiImg} alt="Saraswati Emblem" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight font-heading">Rawat Classes</h2>
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Education & Knowledge Portal</p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold font-heading">
                  ✨ ॐ श्री सरस्वत्यै नमः
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight font-heading leading-tight uppercase bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                WE WANT YOU TO EXCEL
              </h1>
            </div>
          </div>

          {/* Maa Saraswati Image Showcase Card */}
          <div className="my-4 relative group z-10 flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/30 shadow-2xl bg-slate-950/80 p-2 max-w-xs w-full">
              <img
                src={saraswatiImg}
                alt="Maa Saraswati — Goddess of Knowledge"
                className="w-full rounded-xl object-contain max-h-44 md:max-h-48 transform group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="p-2 text-center bg-slate-950/90 rounded-b-xl border-t border-slate-800/80">
                <span className="text-[11px] font-extrabold text-amber-300 tracking-wider font-heading block uppercase">
                  Rawat Classes — Dedicated to Excellence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center bg-slate-900/40 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
