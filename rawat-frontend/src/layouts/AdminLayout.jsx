import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, resetAuth } from '../store/authSlice';
import { setLocalAccessToken } from '../api/client';
import { useToast } from '../context/ToastContext';
import saraswatiImg from '../assets/saraswati.jpg';

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setLocalAccessToken(null);
    dispatch(resetAuth());
    dispatch(logoutUser());
    toast.info('Signed out of workspace.');
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
    ...(isStudent && user?.profile_id ? [
      { name: 'My Profile', path: `/students/${user.profile_id}`, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
    ] : []),
    ...(isAdmin ? [
      { name: 'Teachers', path: '/teachers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ] : []),
    ...(isAdmin || isTeacher ? [
      { name: 'Batches', path: '/batches', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { name: 'Students', path: '/students', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { name: 'Attendance', path: '/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    ] : []),
    ...(isAdmin ? [
      { name: 'Fees & Billing', path: '/fees', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ] : []),
  ];

  // Current route title mapping for top bar breadcrumbs
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/teachers')) return 'Teachers Registry';
    if (path.startsWith('/batches')) return 'Batches & Schedules';
    if (path.startsWith('/students')) return 'Students Roster';
    if (path.startsWith('/attendance')) return 'Daily Attendance';
    if (path.startsWith('/fees')) return 'Fees & Billing Portal';
    return 'Rawat Workspace';
  };

  const displayName = user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username === 'admin' ? 'Administrator' : user?.username)) || 'User';
  const userInitials = user?.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase() : user?.username?.substring(0, 2).toUpperCase() || 'AD';

  return (
    <div className="h-screen w-full bg-[#070a12] text-slate-100 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Mobile Top Navbar Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900/90 border-b border-slate-800/80 px-5 py-4 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden shadow-md border border-amber-400/40">
            <img src={saraswatiImg} alt="Saraswati Emblem" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-white text-lg font-heading tracking-tight">Rawat Classes</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Fixed Sidebar Navigation with Pinned Footer */}
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:static top-0 left-0 h-full md:h-screen w-72 bg-[#0b101d] border-r border-slate-800/80 shrink-0 z-40 flex flex-col justify-between overflow-hidden`}
      >
        {/* Scrollable Upper Nav Section */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl overflow-hidden border border-amber-400/40 shadow-lg shadow-amber-500/10 shrink-0">
              <img src={saraswatiImg} alt="Maa Saraswati Emblem" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white leading-tight font-heading text-base tracking-tight truncate">
                Rawat Classes
              </span>
              <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">
                Education Portal
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-heading">
              Main Menu
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border-l-4 border-indigo-500 pl-3 font-bold shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
                </svg>
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Strictly Pinned Bottom Sidebar Footer */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-4 shrink-0 mt-auto">
          <div className="flex items-center gap-3 px-1">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-900 to-slate-800 rounded-xl flex items-center justify-center border border-indigo-500/30 text-sm font-black text-indigo-300 uppercase font-heading shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-200 truncate" title={displayName}>{displayName}</span>
              <span className="text-xs text-indigo-400 font-semibold capitalize flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs font-bold text-slate-300 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Strictly Fixed Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#090d16]/90 border-b border-slate-800/80 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Rawat Classes</span>
            <span className="text-slate-700">/</span>
            <span className="text-sm font-bold text-white font-heading">{getBreadcrumb()}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Django System Online
            </div>
          </div>
        </header>

        {/* Independent Scrollable Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
