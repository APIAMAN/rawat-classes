import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import client from '../api/client';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PRESENT: { label: 'Present', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', ring: 'ring-emerald-500' },
  LATE:    { label: 'Late',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',    dot: 'bg-amber-400',    ring: 'ring-amber-500'   },
  ABSENT:  { label: 'Absent',  color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',      dot: 'bg-rose-400',    ring: 'ring-rose-500'    },
  EXCUSED: { label: 'Excused', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',         dot: 'bg-sky-400',     ring: 'ring-sky-500'     },
};
const STATUS_ORDER = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ABSENT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Tab: Take Attendance ─────────────────────────────────────────────────────
const TakeAttendanceTab = ({ batches, userRole, teacherBatchIds }) => {
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(today());
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);   // [{id, student_id, student_name, enrollment_no, status}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type: 'success'|'error', text}

  const allowedBatches = userRole === 'teacher'
    ? batches.filter(b => teacherBatchIds.includes(b.id))
    : batches;

  const loadSession = useCallback(async () => {
    if (!batchId || !date) return;
    setLoading(true);
    setMsg(null);
    setSession(null);
    setRecords([]);
    try {
      const res = await client.get(`attendance/sessions/?batch=${batchId}&date=${date}`);
      const sessions = res.data;
      if (sessions.length > 0) {
        const s = sessions[0];
        setSession(s);
        setRecords(s.records.map(r => ({ ...r })));
        setMsg({ type: 'info', text: `Session loaded — ${s.records.length} students.` });
      } else {
        setMsg({ type: 'none', text: 'No session yet for this date. Click "Start Session" to begin.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to load session.' });
    } finally {
      setLoading(false);
    }
  }, [batchId, date]);

  const startSession = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await client.post('attendance/sessions/', { batch: batchId, date });
      const s = res.data;
      setSession(s);
      setRecords(s.records.map(r => ({ ...r })));
      setMsg({ type: 'success', text: `Session started — ${s.records.length} students loaded (all marked Absent by default).` });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.[0] || e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed to start session.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (recordId, currentStatus) => {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: next } : r));
  };

  const setAllStatus = (newStatus) => {
    setRecords(prev => prev.map(r => ({ ...r, status: newStatus })));
  };

  const saveAttendance = async () => {
    if (!session) return;
    setSaving(true);
    setMsg(null);
    try {
      await client.patch(`attendance/sessions/${session.id}/mark/`, {
        records: records.map(r => ({ student_id: r.student_id, status: r.status }))
      });
      setMsg({ type: 'success', text: 'Attendance saved successfully!' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = records.filter(r => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Batch</label>
            <select
              value={batchId}
              onChange={e => { setBatchId(e.target.value); setSession(null); setRecords([]); setMsg(null); }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select a batch —</option>
              {allowedBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setSession(null); setRecords([]); setMsg(null); }}
              max={today()}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={loadSession}
            disabled={!batchId || loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Loading...' : 'Load Session'}
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {msg && (
        <div className={`rounded-xl px-5 py-3.5 text-sm font-medium border ${
          msg.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' :
          msg.type === 'error'   ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' :
          msg.type === 'info'    ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300' :
                                   'bg-slate-900/40 border-slate-700 text-slate-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Start Session CTA */}
      {!session && !loading && batchId && msg?.type === 'none' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-slate-300 font-semibold text-lg mb-1">No session for this date</p>
          <p className="text-slate-500 text-sm mb-6">Starting a session will auto-generate attendance records for all enrolled students (defaulted to Absent).</p>
          <button
            onClick={startSession}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            Start Session
          </button>
        </div>
      )}

      {/* Roster Table */}
      {session && records.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
            <div>
              <h3 className="font-semibold text-white">{batches.find(b => b.id == batchId)?.name}</h3>
              <p className="text-sm text-slate-400">{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {/* Quick stats */}
            <div className="flex items-center gap-3 flex-wrap">
              {STATUS_ORDER.map(s => (
                <span key={s} className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_CONFIG[s].color}`}>
                  {stats[s]} {STATUS_CONFIG[s].label}
                </span>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-950/30 border-b border-slate-800">
            <span className="text-xs text-slate-500 font-medium mr-2">Mark all as:</span>
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                onClick={() => setAllStatus(s)}
                className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all hover:brightness-110 ${STATUS_CONFIG[s].color}`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Student rows */}
          <div className="divide-y divide-slate-800/60">
            {records.map((record, idx) => (
              <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{record.student_name}</p>
                    <p className="text-xs text-slate-500">{record.enrollment_no}</p>
                  </div>
                </div>
                {/* Status toggles */}
                <div className="flex items-center gap-2">
                  {STATUS_ORDER.map(s => (
                    <button
                      key={s}
                      onClick={() => setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: s } : r))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                        record.status === s
                          ? `${STATUS_CONFIG[s].color} ring-1 ${STATUS_CONFIG[s].ring}`
                          : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-950/30 border-t border-slate-800">
            <p className="text-xs text-slate-500">{records.length} students total</p>
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Attendance History ──────────────────────────────────────────────────
const HistoryTab = ({ batches, userRole, teacherBatchIds }) => {
  const [batchId, setBatchId] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(today());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const allowedBatches = userRole === 'teacher'
    ? batches.filter(b => teacherBatchIds.includes(b.id))
    : batches;

  const fetchHistory = async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ batch: batchId, from: fromDate, to: toDate });
      const res = await client.get(`attendance/records/?${params}`);
      setRecords(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  // Group records by date, then by student
  const grouped = records.reduce((acc, rec) => {
    const date = rec.session_date || rec.session;
    if (!acc[date]) acc[date] = {};
    acc[date][rec.student_id] = rec;
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const students = [...new Map(records.map(r => [r.student_id, { id: r.student_id, name: r.student_name, no: r.enrollment_no }])).values()];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Batch</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select a batch —</option>
              {allowedBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} max={toDate}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate} max={today()}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button
            onClick={fetchHistory}
            disabled={!batchId || loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Loading...' : 'Load History'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-5 py-3.5 text-sm text-rose-300">{error}</div>
      )}

      {/* History Table */}
      {records.length > 0 && !loading && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-white">Attendance History</h3>
            <p className="text-sm text-slate-400">{fromDate} → {toDate} · {dates.length} session(s) · {students.length} student(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-950/80 min-w-[160px]">Student</th>
                  {dates.map(d => (
                    <th key={d} className="px-3 py-3 text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3 sticky left-0 bg-slate-900/90">
                      <p className="font-medium text-white">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.no}</p>
                    </td>
                    {dates.map(d => {
                      const rec = grouped[d]?.[student.id];
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          {rec ? <StatusBadge status={rec.status} /> : <span className="text-slate-700 text-xs">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && records.length === 0 && batchId && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-slate-400">No attendance records found for the selected range.</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Attendance Page ─────────────────────────────────────────────────────
const Attendance = () => {
  const { user } = useSelector(state => state.auth);
  const userRole = user?.role;

  const [activeTab, setActiveTab] = useState('take');
  const [batches, setBatches] = useState([]);
  const [teacherBatchIds, setTeacherBatchIds] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      setBatchesLoading(true);
      try {
        const res = await client.get('batches/?is_active=true');
        const all = res.data;
        setBatches(all);
        if (userRole === 'teacher') {
          setTeacherBatchIds(all.filter(b => b.teacher_name || true).map(b => b.id));
        }
      } catch (_) {
        setBatches([]);
      } finally {
        setBatchesLoading(false);
      }
    };
    fetchBatches();
  }, [userRole]);

  const tabs = [
    { id: 'take',    label: 'Take Attendance', icon: '✏️' },
    { id: 'history', label: 'History',         icon: '📋' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance</h1>
          <p className="text-sm text-slate-400 mt-0.5">Mark daily attendance and review history</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {batchesLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : activeTab === 'take' ? (
        <TakeAttendanceTab batches={batches} userRole={userRole} teacherBatchIds={teacherBatchIds} />
      ) : (
        <HistoryTab batches={batches} userRole={userRole} teacherBatchIds={teacherBatchIds} />
      )}
    </div>
  );
};

export default Attendance;
