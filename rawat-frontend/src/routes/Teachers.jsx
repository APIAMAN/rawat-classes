import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';

const Teachers = () => {
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [specFilter, setSpecFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Form Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    employee_id: '',
    phone: '',
    subject_specialization: '',
    qualification: '',
    joining_date: '',
    is_active: true,
  });

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get('teachers/');
      setTeachers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch teachers.');
      toast.error('Failed to load teacher records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const openAddDrawer = () => {
    setEditingTeacher(null);
    setFormError(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      first_name: '',
      last_name: '',
      employee_id: '',
      phone: '',
      subject_specialization: '',
      qualification: '',
      joining_date: new Date().toISOString().split('T')[0],
      is_active: true,
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (teacher) => {
    setEditingTeacher(teacher);
    setFormError(null);
    setFormData({
      username: teacher.user.username,
      password: '',
      email: teacher.user.email,
      first_name: teacher.user.first_name,
      last_name: teacher.user.last_name,
      employee_id: teacher.employee_id,
      phone: teacher.phone,
      subject_specialization: teacher.subject_specialization,
      qualification: teacher.qualification,
      joining_date: teacher.joining_date,
      is_active: teacher.is_active,
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingTeacher) {
        // Edit Teacher (PUT)
        const payload = {
          user: {
            username: formData.username,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
          },
          employee_id: formData.employee_id,
          phone: formData.phone,
          subject_specialization: formData.subject_specialization,
          qualification: formData.qualification,
          joining_date: formData.joining_date,
          is_active: formData.is_active,
        };
        if (formData.password) {
          payload.user.password = formData.password;
        }

        const response = await client.put(`teachers/${editingTeacher.id}/`, payload);
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? response.data : t));
        setIsDrawerOpen(false);
        toast.success(`Updated teacher profile for ${response.data.user.first_name || response.data.employee_id}`);
      } else {
        // Add New Teacher (POST)
        const response = await client.post('teachers/', formData);
        setTeachers([response.data, ...teachers]);
        setIsDrawerOpen(false);
        toast.success(`Created teacher account for ${response.data.user.first_name || response.data.employee_id}`);
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
        setFormError('Failed to save teacher. Ensure credentials and employee ID are unique.');
      }
      toast.error('Validation error. Check form details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to remove this teacher and delete their associated user account?')) {
      return;
    }
    try {
      await client.delete(`teachers/${id}/`);
      setTeachers(teachers.filter(t => t.id !== id));
      toast.success('Teacher account deleted.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete teacher');
    }
  };

  // Filter & Search Logic
  const filteredTeachers = teachers.filter((teacher) => {
    const fullName = `${teacher.user.first_name} ${teacher.user.last_name} ${teacher.user.username}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || teacher.employee_id.toLowerCase().includes(search.toLowerCase());
    
    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && teacher.is_active) || 
      (activeFilter === 'inactive' && !teacher.is_active);

    const matchesSpec = !specFilter || teacher.subject_specialization.toLowerCase().includes(specFilter.toLowerCase());

    return matchesSearch && matchesActive && matchesSpec;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const uniqueSpecs = Array.from(new Set(teachers.map(t => t.subject_specialization))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Teachers Registry"
        subtitle="Manage academic faculty, credentials, and subject specializations"
        badge={`${teachers.length} Active Staff`}
        actionButton={
          isAdmin ? (
            <button onClick={openAddDrawer} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Teacher
            </button>
          ) : null
        }
      />

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-5 py-3.5 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm">
        <div className="relative w-full md:w-80">
          <svg className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, ID..."
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
            value={specFilter}
            onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
            className="input-base py-2.5"
          >
            <option value="">All Specializations</option>
            {uniqueSpecs.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Component */}
      <DataTable
        headers={['Name & Credentials', 'Employee ID', 'Specialization', 'Phone', 'Status', { label: 'Actions', align: 'right' }]}
        loading={loading}
        empty={filteredTeachers.length === 0}
        emptyMessage="No teachers matching the search filter."
        colSpan={6}
      >
        {paginatedTeachers.map((teacher) => (
          <tr key={teacher.id} className="hover:bg-slate-800/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs font-heading">
                  {(teacher.user.first_name || teacher.user.username).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <Link to={`/teachers/${teacher.id}`} className="font-bold text-white hover:text-indigo-400 transition-colors font-heading block">
                    {teacher.user.get_full_name || `${teacher.user.first_name} ${teacher.user.last_name}` || teacher.user.username}
                  </Link>
                  <span className="text-xs text-slate-500">{teacher.user.email}</span>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">
              {teacher.employee_id}
            </td>
            <td className="px-6 py-4 font-medium text-slate-300">
              {teacher.subject_specialization}
            </td>
            <td className="px-6 py-4 text-xs font-semibold text-slate-400">
              {teacher.phone}
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                teacher.is_active 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${teacher.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {teacher.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/teachers/${teacher.id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="View Detail"
                >
                  👁️
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditDrawer(teacher)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      title="Edit Teacher"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Teacher"
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-sm text-slate-400">
          <span>Showing Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Form Slide-Over Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-heading">
                    {editingTeacher ? 'Edit Teacher Profile' : 'Register New Teacher'}
                  </h2>
                  <button onClick={() => setIsDrawerOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {formError}
                  </div>
                )}

                <form id="teacherForm" onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">First Name</label>
                      <input
                        type="text"
                        name="first_name"
                        required
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="input-base w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        required
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="input-base w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Employee ID</label>
                    <input
                      type="text"
                      name="employee_id"
                      required
                      placeholder="e.g. TCH-2026-01"
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      className="input-base w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                      {editingTeacher ? 'New Password (Leave blank to keep current)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      name="password"
                      required={!editingTeacher}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Specialization</label>
                    <input
                      type="text"
                      name="subject_specialization"
                      required
                      placeholder="e.g. Mathematics, Organic Chemistry"
                      value={formData.subject_specialization}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Qualification</label>
                    <input
                      type="text"
                      name="qualification"
                      required
                      placeholder="e.g. M.Sc. Physics, Ph.D."
                      value={formData.qualification}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Joining Date</label>
                    <input
                      type="date"
                      name="joining_date"
                      required
                      value={formData.joining_date}
                      onChange={handleInputChange}
                      className="input-base w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-300">
                      Active Staff Member
                    </label>
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="teacherForm"
                  disabled={formLoading}
                  className="btn-primary flex-1"
                >
                  {formLoading ? 'Saving...' : editingTeacher ? 'Save Profile' : 'Create Teacher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
