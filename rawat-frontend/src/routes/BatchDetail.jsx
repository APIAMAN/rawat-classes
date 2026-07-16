import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

const BatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBatch = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get(`batches/${id}/`);
        setBatch(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Batch not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-6">
        <Link to="/batches" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Batches
        </Link>
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 text-center text-rose-400 max-w-md mx-auto shadow-2xl">
          <h2 className="text-xl font-bold mb-2">Error Loading Batch</h2>
          <p className="text-sm text-rose-300/80 mb-6">{error || 'Unable to retrieve details.'}</p>
          <button
            onClick={() => navigate('/batches')}
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
        <Link to="/batches" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Batches
        </Link>
      </div>

      {/* Batch Title Header Card */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="h-20 w-20 bg-indigo-600/20 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-indigo-400">
            {batch.subject.substring(0, 1) || 'B'}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
              {batch.name}
            </h1>
            <p className="text-slate-400 text-sm">{batch.subject} | {batch.start_date} to {batch.end_date}</p>
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              {batch.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Cohort
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
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Capacity</span>
          <span className="text-sm font-bold text-indigo-400">{batch.capacity} Students Max</span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cohort Details */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Cohort parameters</h2>
          <div className="divide-y divide-slate-800/60 text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Subject</span>
              <span className="font-semibold text-slate-200">{batch.subject}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Term Start</span>
              <span className="font-semibold text-slate-200">{batch.start_date}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Term End</span>
              <span className="font-semibold text-slate-200">{batch.end_date}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Instructing Teacher</span>
              <Link to={`/teachers/${batch.teacher.id}`} className="font-semibold text-indigo-400 hover:underline">
                {`${batch.teacher.user.first_name} ${batch.teacher.user.last_name}`}
              </Link>
            </div>
          </div>
        </div>

        {/* Weekly Timing Schedules */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Weekly timing slots</h2>
          {batch.schedules.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No weekly schedules defined for this batch.
            </div>
          ) : (
            <div className="space-y-2">
              {batch.schedules.map((slot) => (
                <div key={slot.id} className="flex justify-between items-center bg-slate-950/50 border border-slate-850 p-3 rounded-xl">
                  <span className="text-sm font-semibold capitalize text-slate-200">{slot.day_of_week}</span>
                  <span className="text-xs text-indigo-400 font-medium">
                    {slot.start_time.substring(0, 5)} to {slot.end_time.substring(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Roster placeholder */}
      <div className="bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Student Roster</h2>
          <p className="text-slate-500 text-xs mt-0.5">Enrolled students and attendance ratios for this batch</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-10 text-center text-slate-500">
          <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          No students registered in this batch. (Student roster allocation will be wired in Phase 4).
        </div>
      </div>
    </div>
  );
};

export default BatchDetail;
