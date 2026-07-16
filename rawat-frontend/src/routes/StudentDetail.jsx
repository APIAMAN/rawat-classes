import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

// ─── Attendance Summary Card ──────────────────────────────────────────────────
const AttendanceSummaryCard = ({ studentId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await client.get(`attendance/summary/?student=${studentId}`);
        if (res.data.length > 0) setSummary(res.data[0]);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetch();
  }, [studentId]);

  if (loading) return (
    <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );

  if (!summary || summary.total_sessions === 0) return (
    <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl text-center text-slate-500 text-xs">
      <svg className="w-8 h-8 text-slate-650 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
      </svg>
      No attendance sessions recorded yet.
    </div>
  );

  const pct = summary.attendance_percentage;
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400';
  const ring  = pct >= 75 ? 'stroke-emerald-500' : pct >= 50 ? 'stroke-amber-500' : 'stroke-rose-500';
  const circumference = 2 * Math.PI * 36;
  const dash = (pct / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Donut + % */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle cx="40" cy="40" r="36" fill="none" className={ring} strokeWidth="8"
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-black ${color}`}>{pct}%</span>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Present</span>
            <span className="ml-auto font-bold text-white">{summary.present_count}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">Late</span>
            <span className="ml-auto font-bold text-white">{summary.late_count}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-slate-400">Absent</span>
            <span className="ml-auto font-bold text-white">{summary.absent_count}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-slate-400">Excused</span>
            <span className="ml-auto font-bold text-white">{summary.excused_count}</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">Total Sessions</span>
        <span className="font-bold text-slate-200">{summary.total_sessions}</span>
      </div>
    </div>
  );
};

// ─── Student Fees & Billing Card ──────────────────────────────────────────────
const StudentFeesCard = ({ studentId }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await client.get(`fees/invoices/?student=${studentId}`);
        setInvoices(res.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchInvoices();
  }, [studentId]);

  if (loading) return (
    <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );

  const totalDue = invoices.reduce((acc, inv) => acc + Number(inv.balance_due), 0);

  return (
    <div className="space-y-4">
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Outstanding Dues</span>
          <span className={`text-xl font-black ${totalDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            ₹{totalDue.toLocaleString('en-IN')}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${totalDue > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
          {totalDue > 0 ? 'Dues Outstanding' : 'All Clear'}
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl text-center text-slate-500 text-xs">
          No billing invoices issued for this student yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-indigo-400 block">INV-{String(inv.id).padStart(4, '0')}</span>
                <span className="text-slate-400">Due: {inv.due_date}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-white block">₹{Number(inv.amount_due).toLocaleString('en-IN')}</span>
                <span className={`text-[10px] font-semibold ${inv.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get(`students/${id}/`);
        setStudent(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Student profile not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Link to="/students" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Students
        </Link>
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 text-center text-rose-400 max-w-md mx-auto shadow-2xl">
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-sm text-rose-300/80 mb-6">{error || 'Unable to retrieve records.'}</p>
          <button
            onClick={() => navigate('/students')}
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
        <Link to="/students" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Students
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="h-20 w-20 bg-indigo-600/20 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-indigo-400 uppercase">
            {student.user.first_name.substring(0, 1) || 'S'}
            {student.user.last_name.substring(0, 1) || 'T'}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
              {student.user.first_name} {student.user.last_name}
            </h1>
            <p className="text-slate-400 text-sm">@{student.user.username} | {student.enrollment_no}</p>
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              {student.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Student
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
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Admission Date</span>
          <span className="text-sm font-bold text-indigo-400">{student.admission_date}</span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Student Information</h2>
          <div className="divide-y divide-slate-800/60 text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Email Address</span>
              <span className="font-semibold text-slate-200">{student.user.email}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Phone Number</span>
              <span className="font-semibold text-slate-200">{student.phone}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Date of Birth</span>
              <span className="font-semibold text-slate-200">{student.date_of_birth}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Enrollment ID</span>
              <span className="font-semibold text-mono text-indigo-400">{student.enrollment_no}</span>
            </div>
          </div>
        </div>

        {/* Guardian details */}
        <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-white">Guardian Contacts</h2>
          <div className="divide-y divide-slate-800/60 text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Guardian Name</span>
              <span className="font-semibold text-slate-200">{student.guardian_name}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Guardian Phone</span>
              <span className="font-semibold text-slate-200">{student.guardian_phone}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Workspace Role</span>
              <span className="font-semibold text-slate-200 capitalize">{student.user.role}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">System ID</span>
              <span className="font-semibold text-slate-200">{student.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohorts Enrolled & Schedules */}
      <div className="bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Class Allocations</h2>
          <p className="text-slate-500 text-xs mt-0.5">Batches this student is enrolled in</p>
        </div>
        {student.enrollments.filter(e => e.is_active).length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-10 text-center text-slate-500">
            Student is not currently enrolled in any active cohorts.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.enrollments.filter(e => e.is_active).map((e) => (
              <div key={e.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <Link to={`/batches/${e.batch}`} className="text-slate-200 hover:text-indigo-400 font-bold block">
                    {e.batch_name}
                  </Link>
                  <span className="text-xs text-slate-500 font-medium">Subject: {e.subject}</span>
                </div>
                <span className="text-[10px] text-indigo-450 font-semibold px-2 py-0.5 bg-indigo-950/20 border border-indigo-900/20 rounded-full">
                  Enrolled
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Tabs / Grid for Attendance & Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Attendance Summary */}
        <div className="bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Attendance Summary</h2>
            <p className="text-slate-500 text-xs mt-0.5">Overall roll call ratio across all sessions</p>
          </div>
          <AttendanceSummaryCard studentId={id} />
        </div>

        {/* Live Balance & Receipts */}
        <div className="bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6 md:p-8 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Balance & Billing Ledger</h2>
            <p className="text-slate-500 text-xs mt-0.5">Invoices, pending dues, and payment history</p>
          </div>
          <StudentFeesCard studentId={id} />
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
