import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const Batches = () => {
  const toast = useToast();
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
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Batch Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Batch Form Fields
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    teacher: '',
    start_date: '',
    end_date: '',
    capacity: 30,
    is_active: true,
  });

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedBatchForSchedule, setSelectedBatchForSchedule] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 'monday',
    start_time: '10:00',
    end_time: '11:30',
  });
  const [scheduleError, setScheduleError] = useState(null);

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
      setError(err.response?.data?.detail || 'Failed to fetch batch lists.');
      toast.error('Failed to load batch lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingBatch(null);
    setFormError(null);
    setFormData({
      name: '',
      subject: '',
      teacher: teachers[0]?.id || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      capacity: 30,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setFormError(null);
    setFormData({
      name: batch.name,
      subject: batch.subject,
      teacher: batch.teacher,
      start_date: batch.start_date,
      end_date: batch.end_date,
      capacity: batch.capacity,
      is_active: batch.is_active,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingBatch) {
        const res = await client.put(`batches/${editingBatch.id}/`, formData);
        setBatches(batches.map(b => b.id === editingBatch.id ? res.data : b));
        setIsModalOpen(false);
        toast.success(`Updated batch ${res.data.name}`);
      } else {
        const res = await client.post('batches/', formData);
        setBatches([res.data, ...batches]);
        setIsModalOpen(false);
        toast.success(`Created batch ${res.data.name}`);
      }
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0];
        setFormError(`${firstKey}: ${Array.isArray(errData[firstKey]) ? errData[firstKey][0] : errData[firstKey]}`);
      } else {
        setFormError('Failed to save batch. Please verify inputs.');
      }
      toast.error('Validation error. Check batch fields.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await client.delete(`batches/${id}/`);
      setBatches(batches.filter(b => b.id !== id));
      toast.success('Batch removed.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete batch.');
    }
  };

  // Schedule Management Logic
  const openScheduleModal = async (batch) => {
    setSelectedBatchForSchedule(batch);
    setScheduleLoading(true);
    setScheduleError(null);
    setIsScheduleModalOpen(true);

    try {
      const res = await client.get(`batches/${batch.id}/schedule/`);
      setSchedules(res.data);
    } catch (err) {
      setScheduleError('Failed to load schedules.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchForSchedule) return;
    setScheduleError(null);

    try {
      const res = await client.post(`batches/${selectedBatchForSchedule.id}/schedule/`, scheduleForm);
      setSchedules([...schedules, res.data]);
      toast.success('Schedule slot added.');
    } catch (err) {
      setScheduleError(err.response?.data?.detail || 'Failed to add schedule slot.');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await client.delete(`batches/${selectedBatchForSchedule.id}/schedule/?schedule_id=${scheduleId}`);
      setSchedules(schedules.filter(s => s.id !== scheduleId));
      toast.success('Schedule slot removed.');
    } catch (err) {
      toast.error('Failed to delete schedule slot.');
    }
  };

  // Filter & Pagination
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.name.toLowerCase().includes(search.toLowerCase()) || batch.subject.toLowerCase().includes(search.toLowerCase());
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' && batch.is_active) || (activeFilter === 'inactive' && !batch.is_active);
    const matchesTeacher = !teacherFilter || String(batch.teacher) === String(teacherFilter);
    return matchesSearch && matchesActive && matchesTeacher;
  });

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const paginatedBatches = filteredBatches.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches & Weekly Schedules"
        subtitle="Manage course cohorts, assigned faculty, capacity limits, and class slots"
        badge={`${batches.length} Total Cohorts`}
        actionButton={
          isAdmin ? (
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Batch
            </button>
          ) : null
        }
      />

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-5 py-3.5 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm">
        <div className="relative w-full md:w-80">
          <svg className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search batch or subject..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-10 w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="input-base py-2.5"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={teacherFilter}
            onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}
            className="input-base py-2.5"
          >
            <option value="">All Assigned Teachers</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.user?.first_name || t.employee_id} ({t.subject_specialization})</option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        headers={['Batch & Subject', 'Assigned Teacher', 'Duration', 'Students / Capacity', 'Status', { label: 'Actions', align: 'right' }]}
        loading={loading}
        empty={filteredBatches.length === 0}
        emptyMessage="No batches matching filter."
        colSpan={6}
      >
        {paginatedBatches.map((batch) => (
          <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
            <td className="px-6 py-4">
              <Link to={`/batches/${batch.id}`} className="font-bold text-white hover:text-indigo-400 font-heading block">
                {batch.name}
              </Link>
              <span className="text-xs text-indigo-400 font-medium">Subject: {batch.subject}</span>
            </td>
            <td className="px-6 py-4 font-medium text-slate-300">
              {batch.teacher_name || 'Unassigned'}
            </td>
            <td className="px-6 py-4 text-xs font-semibold text-slate-400">
              {batch.start_date} → {batch.end_date}
            </td>
            <td className="px-6 py-4">
              <span className="text-xs font-bold text-slate-200">{batch.student_count || 0}</span>
              <span className="text-xs text-slate-500 font-medium"> / {batch.capacity} seats</span>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                batch.is_active 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${batch.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {batch.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => openScheduleModal(batch)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold"
                  title="Weekly Timings"
                >
                  📅 Timings
                </button>
                <Link
                  to={`/batches/${batch.id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="View Detail"
                >
                  👁️
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditModal(batch)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                      title="Edit Batch"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Delete Batch"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-sm text-slate-400">
          <span>Showing Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white font-heading">{editingBatch ? 'Edit Batch Details' : 'Create New Batch'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Batch Title</label>
                <input type="text" name="name" required placeholder="e.g. Class 10 Physics Alpha" value={formData.name} onChange={handleInputChange} className="input-base w-full" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Subject</label>
                <input type="text" name="subject" required placeholder="e.g. Physics, Chemistry, Calculus" value={formData.subject} onChange={handleInputChange} className="input-base w-full" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Assigned Teacher</label>
                <select name="teacher" required value={formData.teacher} onChange={handleInputChange} className="input-base w-full">
                  <option value="">Choose Teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user?.first_name || t.employee_id} ({t.subject_specialization})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start Date</label>
                  <input type="date" name="start_date" required value={formData.start_date} onChange={handleInputChange} className="input-base w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">End Date</label>
                  <input type="date" name="end_date" required value={formData.end_date} onChange={handleInputChange} className="input-base w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Maximum Student Capacity</label>
                <input type="number" name="capacity" min="1" required value={formData.capacity} onChange={handleInputChange} className="input-base w-full" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="b_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="b_active" className="text-sm font-medium text-slate-300">Active Cohort</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={formLoading} className="btn-primary flex-1">{formLoading ? 'Saving...' : editingBatch ? 'Update Batch' : 'Create Batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && selectedBatchForSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white font-heading">Weekly Class Slots</h3>
                <p className="text-xs text-indigo-400 font-semibold">{selectedBatchForSchedule.name}</p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {scheduleError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {scheduleError}
              </div>
            )}

            {/* List of existing slots */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {scheduleLoading ? (
                <p className="text-xs text-slate-500 text-center py-4">Loading weekly slots...</p>
              ) : schedules.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-950 rounded-2xl border border-slate-800">No recurring weekly slots added yet.</p>
              ) : (
                schedules.map(slot => (
                  <div key={slot.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-400 uppercase w-20">{slot.day_of_week}</span>
                      <span className="text-slate-300 font-mono">{slot.start_time} - {slot.end_time}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteSchedule(slot.id)} className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1">✕</button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Slot Form */}
            {isAdmin && (
              <form onSubmit={handleScheduleSubmit} className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Add Weekly Time Slot</h4>
                <div className="grid grid-cols-3 gap-2">
                  <select value={scheduleForm.day_of_week} onChange={e => setScheduleForm({...scheduleForm, day_of_week: e.target.value})} className="input-base text-xs py-2">
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                  <input type="time" required value={scheduleForm.start_time} onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})} className="input-base text-xs py-2" />
                  <input type="time" required value={scheduleForm.end_time} onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})} className="input-base text-xs py-2" />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">+ Add Slot</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
