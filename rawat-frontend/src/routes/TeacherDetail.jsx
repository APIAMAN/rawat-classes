import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeacher = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get(`teachers/${id}/`);
        setTeacher(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Teacher profile not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="space-y-6">
        <Link to="/teachers" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Teachers
        </Link>
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 text-center text-rose-400 max-w-md mx-auto shadow-2xl">
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-sm text-rose-300/80 mb-6">{error || 'Unable to retrieve data.'}</p>
          <button
            onClick={() => navigate('/teachers')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition"
          >
            Return to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back button */}
      <div>
        <Link to="/teachers" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Teachers
        </Link>
      </div>

      {/* Profile summary card */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="h-20 w-20 bg-indigo-600/20 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-indigo-400 uppercase">
            {teacher.user.first_name.substring(0, 1) || 'T'}
            {teacher.user.last_name.substring(0, 1) || 'C'}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
              {teacher.user.first_name} {teacher.user.last_name}
            </h1>
            <p className="text-slate-400 text-sm">@{teacher.user.username} | {teacher.employee_id}</p>
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              {teacher.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Staff
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800/40 text-slate-500 border border-slate-700/50">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-3 text-center shrink-0">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Department</span>
          <span className="text-sm font-bold text-indigo-400">{teacher.subject_specialization}</span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Academic Profile</h2>
          <div className="divide-y divide-slate-800/60 text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Subject Specialty</span>
              <span className="font-semibold text-slate-200">{teacher.subject_specialization}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Qualification</span>
              <span className="font-semibold text-slate-200">{teacher.qualification}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Joining Date</span>
              <span className="font-semibold text-slate-200">{teacher.joining_date}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Employee ID</span>
              <span className="font-semibold text-mono text-indigo-400">{teacher.employee_id}</span>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Contact details</h2>
          <div className="divide-y divide-slate-800/60 text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Email Address</span>
              <span className="font-semibold text-slate-200">{teacher.user.email}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Phone Number</span>
              <span className="font-semibold text-slate-200">{teacher.phone}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Workspace Role</span>
              <span className="font-semibold text-slate-200 capitalize">{teacher.user.role}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">System ID</span>
              <span className="font-semibold text-slate-200">{teacher.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Batches placeholder */}
      <div className="bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Assigned Batches</h2>
          <p className="text-slate-500 text-xs mt-0.5">Schedules and batch rosters allocated to this teacher</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-10 text-center text-slate-500">
          <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          No batches assigned yet. (Batch scheduler integration will be wired in Phase 4).
        </div>
      </div>
    </div>
  );
};

export default TeacherDetail;
