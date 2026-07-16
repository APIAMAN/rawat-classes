import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const Batches = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Form Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    teacher: '',
    start_date: '',
    end_date: '',
    capacity: 30,
    is_active: true,
    schedules: [],
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchesRes, teachersRes] = await Promise.all([
        client.get('batches/'),
        client.get('teachers/'),
      ]);
      setBatches(batchesRes.data);
      setTeachers(teachersRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddDrawer = () => {
    setEditingBatch(null);
    setFormError(null);
    setFormData({
      name: '',
      subject: '',
      teacher: teachers.filter(t => t.is_active)[0]?.id || '', // select first active teacher
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +6 months
      capacity: 30,
      is_active: true,
      schedules: [],
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (batch) => {
    setEditingBatch(batch);
    setFormError(null);
    setFormData({
      name: batch.name,
      subject: batch.subject,
      teacher: batch.teacher.id,
      start_date: batch.start_date,
      end_date: batch.end_date,
      capacity: batch.capacity,
      is_active: batch.is_active,
      // Format backend times (e.g. 10:00:00) to HH:MM for time inputs
      schedules: batch.schedules.map(slot => ({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time.substring(0, 5),
        end_time: slot.end_time.substring(0, 5),
      })),
    });
    setIsDrawerOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Schedule slot triggers
  const addScheduleSlot = () => {
    setFormData({
      ...formData,
      schedules: [
        ...formData.schedules,
        { day_of_week: 'monday', start_time: '10:00', end_time: '11:30' },
      ],
    });
  };

  const removeScheduleSlot = (idx) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.filter((_, i) => i !== idx),
    });
  };

  const handleSlotChange = (idx, field, value) => {
    const updatedSchedules = formData.schedules.map((slot, i) =>
      i === idx ? { ...slot, [field]: value } : slot
    );
    setFormData({
      ...formData,
      schedules: updatedSchedules,
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    // Validate that end date is after start date
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setFormError('End Date must be after the Start Date.');
      setFormLoading(false);
      return;
    }

    try {
      // Append seconds to times so Django time fields parse them cleanly
      const formattedSchedules = formData.schedules.map(slot => ({
        ...slot,
        start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
        end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time,
      }));

      const payload = {
        ...formData,
        schedules: formattedSchedules,
      };

      if (editingBatch) {
        const response = await client.put(`batches/${editingBatch.id}/`, payload);
        setBatches(batches.map(b => b.id === editingBatch.id ? response.data : b));
        setIsDrawerOpen(false);
      } else {
        const response = await client.post('batches/', payload);
        setBatches([response.data, ...batches]);
        setIsDrawerOpen(false);
      }
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const firstErrorKey = Object.keys(errData)[0];
        const errorMessage = Array.isArray(errData[firstErrorKey]) 
          ? errData[firstErrorKey][0] 
          : JSON.stringify(errData[firstErrorKey]);
        setFormError(`${firstErrorKey}: ${errorMessage}`);
      } else {
        setFormError('Failed to save batch. Ensure all fields are valid.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Are you sure you want to remove this batch?')) {
      return;
    }
    try {
      await client.delete(`batches/${id}/`);
      setBatches(batches.filter(b => b.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete batch.');
    }
  };

  // Filter & Search Logic
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = 
      batch.name.toLowerCase().includes(search.toLowerCase()) || 
      batch.subject.toLowerCase().includes(search.toLowerCase());

    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && batch.is_active) || 
      (activeFilter === 'inactive' && !batch.is_active);

    const matchesTeacher = !teacherFilter || batch.teacher.id === parseInt(teacherFilter);
    const matchesSubject = !subjectFilter || batch.subject.toLowerCase() === subjectFilter.toLowerCase();

    return matchesSearch && matchesActive && matchesTeacher && matchesSubject;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const paginatedBatches = filteredBatches.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const uniqueSubjects = Array.from(new Set(batches.map(b => b.subject))).filter(Boolean);
  const activeTeachers = teachers.filter(t => t.is_active || (editingBatch && t.id === editingBatch.teacher.id));

  // Schedule string formatting helper
  const formatSchedules = (slots) => {
    if (!slots || slots.length === 0) return 'No schedule set';
    return slots.map(slot => {
      const day = slot.day_of_week.substring(0, 3); // Mon, Tue
      const start = slot.start_time.substring(0, 5); // HH:MM
      const end = slot.end_time.substring(0, 5); // HH:MM
      return `${day} (${start}-${end})`;
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">Batches & Schedules</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage study cohorts, teacher assignments, and time slots</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddDrawer}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Batch
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by batch or subject name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-150"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Active filter */}
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Teacher filter (Admin only) */}
          {isAdmin && (
            <select
              value={teacherFilter}
              onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px]"
            >
              <option value="">All Teachers</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{`${t.user.first_name} ${t.user.last_name}`}</option>
              ))}
            </select>
          )}

          {/* Subject filter */}
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px]"
          >
            <option value="">All Subjects</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center text-rose-400">
          {error}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-slate-900/10 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          No batches found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Batch Name</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Weekly Schedule</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="px-6 py-4">
                        <Link to={`/batches/${batch.id}`} className="font-semibold text-slate-200 hover:text-indigo-400">
                          {batch.name}
                        </Link>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{batch.start_date} to {batch.end_date}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{batch.subject}</td>
                      <td className="px-6 py-4">
                        <span className="text-slate-200 font-medium">
                          {`${batch.teacher.user.first_name} ${batch.teacher.user.last_name}`}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">@{batch.teacher.user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400 max-w-[200px] truncate block">
                          {formatSchedules(batch.schedules)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{batch.capacity} Students</td>
                      <td className="px-6 py-4">
                        {batch.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/50">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/40 text-slate-500 border border-slate-700/50">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 shrink-0">
                        <Link
                          to={`/batches/${batch.id}`}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditDrawer(batch)}
                              className="inline-flex items-center justify-center p-2 text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600 border border-indigo-900/30 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="inline-flex items-center justify-center p-2 text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-600 border border-rose-900/30 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Indicators */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
              <span className="text-xs text-slate-500">
                Showing Page {page} of {totalPages} ({filteredBatches.length} entries)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs rounded-lg border border-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs rounded-lg border border-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Drawer / Modal Form (Admin Only) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop Overlay */}
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl">
                  {/* Drawer Header */}
                  <div className="px-6 py-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {editingBatch ? 'Edit Batch Details' : 'Create New Batch'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {editingBatch ? 'Modify course parameters and timings' : 'Define subjects, allocate teachers, and set schedule slots'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Drawer Form Body */}
                  <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between p-6 space-y-6">
                    <div className="space-y-4">
                      {formError && (
                        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-300 font-medium">
                          {formError}
                        </div>
                      )}

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Batch Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          disabled={formLoading}
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. Grade 10 Math Alpha"
                        />
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          name="subject"
                          required
                          disabled={formLoading}
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. Mathematics"
                        />
                      </div>

                      {/* Teacher Dropdown (Only shows active teachers) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Assign Teacher
                        </label>
                        {activeTeachers.length === 0 ? (
                          <div className="text-xs text-amber-500 border border-amber-900/30 bg-amber-950/20 rounded-xl p-3">
                            No active teachers available. Please add or activate a teacher profile first.
                          </div>
                        ) : (
                          <select
                            name="teacher"
                            required
                            disabled={formLoading}
                            value={formData.teacher}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Select a Teacher</option>
                            {activeTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {`${t.user.first_name} ${t.user.last_name} (${t.subject_specialization})`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Start Date
                          </label>
                          <input
                            type="date"
                            name="start_date"
                            required
                            disabled={formLoading}
                            value={formData.start_date}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            End Date
                          </label>
                          <input
                            type="date"
                            name="end_date"
                            required
                            disabled={formLoading}
                            value={formData.end_date}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Capacity & Active Status */}
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Batch Capacity
                          </label>
                          <input
                            type="number"
                            name="capacity"
                            min="1"
                            required
                            disabled={formLoading}
                            value={formData.capacity}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5 pl-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            disabled={formLoading}
                            checked={formData.is_active}
                            onChange={handleInputChange}
                            className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="is_active" className="text-sm font-semibold text-slate-350 select-none">
                            Active Batch
                          </label>
                        </div>
                      </div>

                      {/* Weekly Schedule Builder */}
                      <div className="border-t border-slate-800 my-4 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Weekly Timing Slots</span>
                          <button
                            type="button"
                            onClick={addScheduleSlot}
                            disabled={formLoading}
                            className="text-xs px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 font-semibold transition"
                          >
                            + Add Timing Slot
                          </button>
                        </div>

                        {formData.schedules.length === 0 ? (
                          <div className="text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl py-6">
                            No timing slots added yet. This batch will remain unscheduled.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                            {formData.schedules.map((slot, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                                {/* Day select */}
                                <select
                                  value={slot.day_of_week}
                                  onChange={(e) => handleSlotChange(idx, 'day_of_week', e.target.value)}
                                  disabled={formLoading}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 w-28 focus:outline-none"
                                >
                                  {DAYS_OF_WEEK.map(day => (
                                    <option key={day.value} value={day.value}>{day.label}</option>
                                  ))}
                                </select>
                                {/* Start time */}
                                <input
                                  type="time"
                                  value={slot.start_time}
                                  onChange={(e) => handleSlotChange(idx, 'start_time', e.target.value)}
                                  disabled={formLoading}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 w-24 focus:outline-none"
                                />
                                <span className="text-slate-500 text-xs">-</span>
                                {/* End time */}
                                <input
                                  type="time"
                                  value={slot.end_time}
                                  onChange={(e) => handleSlotChange(idx, 'end_time', e.target.value)}
                                  disabled={formLoading}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 w-24 focus:outline-none"
                                />
                                {/* Delete slot button */}
                                <button
                                  type="button"
                                  onClick={() => removeScheduleSlot(idx)}
                                  className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-950/20 rounded-md transition"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center gap-3 border-t border-slate-800 pt-6">
                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-xl text-slate-300 text-sm transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading || activeTeachers.length === 0}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white text-sm transition flex items-center justify-center gap-2"
                      >
                        {formLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Batch</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
