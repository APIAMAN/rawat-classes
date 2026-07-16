import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'admin';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [cardStats, setCardStats] = useState({});
  const [feesSummary, setFeesSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const reqs = [client.get('dashboard/stats/')];
        if (isAdmin) {
          reqs.push(client.get('fees/dashboard/'));
        }
        const [statsRes, feesRes] = await Promise.allSettled(reqs);

        if (statsRes.status === 'fulfilled') {
          setCardStats(statsRes.value.data);
        }
        if (feesRes && feesRes.status === 'fulfilled') {
          setFeesSummary(feesRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  // Generate Role-Wise Stat Cards
  const getRoleStats = () => {
    if (isTeacher) {
      return [
        {
          label: 'Assigned Batches',
          value: cardStats.assigned_batches ?? 0,
          change: 'Assigned Cohorts',
          icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
        },
        {
          label: 'My Enrolled Students',
          value: cardStats.my_students ?? 0,
          change: 'Students in My Cohorts',
          icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        },
        {
          label: 'Attendance Sessions',
          value: cardStats.marked_sessions ?? 0,
          change: 'Roll Calls Conducted',
          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        },
        {
          label: 'Batch Attendance %',
          value: `${cardStats.avg_attendance_pct ?? 0}%`,
          change: `${cardStats.total_attendance_records ?? 0} Attendance Logs`,
          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        },
      ];
    }

    if (role === 'student') {
      return [
        {
          label: 'Enrolled Batches',
          value: cardStats.enrolled_batches ?? 0,
          change: 'Active Enrolled Classes',
          icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
        },
        {
          label: 'Classes Attended',
          value: cardStats.classes_attended ?? 0,
          change: 'Present Roll Calls',
          icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        },
        {
          label: 'Total Sessions',
          value: cardStats.total_classes ?? 0,
          change: 'Conducted Sessions',
          icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        },
        {
          label: 'My Attendance %',
          value: `${cardStats.avg_attendance_pct ?? 0}%`,
          change: 'Overall Record Percentage',
          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        },
      ];
    }

    // Admin role (default)
    return [
      {
        label: 'Active Batches',
        value: cardStats.active_batches ?? 0,
        change: 'Running Cohorts',
        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      },
      {
        label: 'Total Students',
        value: cardStats.total_students ?? 0,
        change: 'Active Enrolled Students',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      },
      {
        label: 'Active Teachers',
        value: cardStats.active_teachers ?? 0,
        change: 'Faculty Roster',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      },
      {
        label: 'Institute Attendance',
        value: `${cardStats.avg_attendance_pct ?? 0}%`,
        change: `${cardStats.total_attendance_records ?? 0} Total Logged Calls`,
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      },
    ];
  };

  const displayName = user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username === 'admin' ? 'Administrator' : user?.username)) || 'User';
  const stats = getRoleStats();

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 text-center md:text-left relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold font-heading">
            ⚡ Real-time Analytics Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide font-heading">
            Welcome back, <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-300 bg-clip-text text-transparent">{displayName}</span>!
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-lg">
            {isTeacher
              ? 'Real-time overview of your assigned batches, student rosters, and roll call attendance.'
              : role === 'student'
              ? 'Real-time overview of your enrolled classes and academic attendance history.'
              : 'Live database metric synthesis of student rosters, active batches, attendance logs, and fee collections.'}
          </p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-center shrink-0 relative z-10">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Assigned System Role</span>
          <span className="text-sm font-extrabold text-indigo-400 capitalize font-heading">{user?.role}</span>
        </div>
      </div>

      {/* Role-tailored Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between gap-4 shadow-md hover:border-slate-700 transition-all">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">{stat.label}</span>
              <span className="text-2xl md:text-3xl font-black text-white font-heading">{loading ? '...' : stat.value}</span>
              <span className="text-xs text-indigo-400 font-medium block">{stat.change}</span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={stat.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Admin-only Fees & Revenue Summary Widget */}
      {isAdmin && feesSummary && (
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-950 to-slate-950 border border-slate-800/90 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Revenue & Fees Overview
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Real-time breakdown of collections and pending dues</p>
            </div>
            <Link
              to="/fees"
              className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
            >
              Open Fees Portal →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Collected This Month</span>
              <span className="text-2xl font-black text-emerald-400 font-heading">₹{Number(feesSummary.collected_this_month).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Pending Dues</span>
              <span className="text-2xl font-black text-amber-400 font-heading">₹{Number(feesSummary.total_pending).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Overdue Count</span>
              <span className="text-2xl font-black text-rose-400 font-heading">{feesSummary.overdue_count} Invoices</span>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white font-heading">Authenticated Profile Session</h2>
          <p className="text-slate-500 text-xs mt-0.5">Secure JWT authentication session synced with Django REST Framework</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">User Identity</span>
            <span className="text-sm font-semibold text-slate-200">{displayName} (@{user?.username})</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</span>
            <span className="text-sm font-semibold text-slate-200">{user?.email}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Role Classification</span>
            <span className="text-sm font-semibold text-slate-200 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
