import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [feesSummary, setFeesSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await client.get('fees/dashboard/');
        setFeesSummary(res.data);
      } catch (_) {}
    };
    fetchSummary();
  }, []);

  const stats = [
    { label: 'Active Batches', value: '12', change: '+2 this month', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { label: 'Total Students', value: '284', change: '+18% growth', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Active Teachers', value: '16', change: 'Stable', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Avg Attendance', value: '94.2%', change: '+0.5% vs last week', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.username}</span>!
          </h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Here's a quick overview of what's happening at Rawat Classes today.
          </p>
        </div>
        <div className="bg-slate-850 border border-slate-700/50 rounded-2xl px-5 py-3 text-center shrink-0">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Assigned Role</span>
          <span className="text-sm font-bold text-indigo-400 capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">{stat.label}</span>
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-indigo-400 font-medium block">{stat.change}</span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Fees & Revenue Summary Widget */}
      {feesSummary && (
        <div className="bg-gradient-to-r from-slate-900/80 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Revenue & Fees Overview
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Real-time breakdown of collections and pending dues</p>
            </div>
            {isAdmin && (
              <Link
                to="/fees"
                className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
              >
                Open Fees Portal →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Collected This Month</span>
              <span className="text-2xl font-black text-emerald-400">₹{Number(feesSummary.collected_this_month).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Pending Dues</span>
              <span className="text-2xl font-black text-amber-400">₹{Number(feesSummary.total_pending).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Overdue Count</span>
              <span className="text-2xl font-black text-rose-400">{feesSummary.overdue_count} Invoices</span>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">Your Profile Information</h2>
          <p className="text-slate-500 text-xs mt-0.5">Secure authentication profile synced with Django REST Framework</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Username</span>
            <span className="text-sm font-medium text-slate-200">{user?.username}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</span>
            <span className="text-sm font-medium text-slate-200">{user?.email}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Role Classification</span>
            <span className="text-sm font-medium text-slate-200 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
