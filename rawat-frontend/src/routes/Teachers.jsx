import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';

const Teachers = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [specFilter, setSpecFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Form Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null); // null if adding new
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
      password: '', // blank by default for edit
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
        // Add password if they provided a new one
        if (formData.password) {
          payload.user.password = formData.password;
        }

        const response = await client.put(`teachers/${editingTeacher.id}/`, payload);
        // Update local state
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? response.data : t));
        setIsDrawerOpen(false);
      } else {
        // Add New Teacher (POST)
        const response = await client.post('teachers/', formData);
        setTeachers([response.data, ...teachers]);
        setIsDrawerOpen(false);
      }
    } catch (err) {
      // Map validation errors nicely
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
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete teacher');
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
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">Teachers Portal</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage details and permissions for academic staff</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddDrawer}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Teacher
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
            placeholder="Search by name or employee ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-150"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Active status filter */}
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Specialization filter */}
          <select
            value={specFilter}
            onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px]"
          >
            <option value="">All Specializations</option>
            {uniqueSpecs.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teachers List Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center text-rose-400">
          {error}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-slate-900/10 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          No teachers found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Employee ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Subject Specialty</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="px-6 py-4 font-mono text-slate-400">{teacher.employee_id}</td>
                      <td className="px-6 py-4">
                        <Link to={`/teachers/${teacher.id}`} className="hover:text-indigo-400 font-semibold text-slate-200">
                          {`${teacher.user.first_name} ${teacher.user.last_name}`}
                        </Link>
                        <span className="block text-xs text-slate-500 mt-0.5">@{teacher.user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/40 rounded-full text-xs text-slate-300">
                          {teacher.subject_specialization}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{teacher.phone}</td>
                      <td className="px-6 py-4">
                        {teacher.is_active ? (
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
                          to={`/teachers/${teacher.id}`}
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
                              onClick={() => openEditDrawer(teacher)}
                              className="inline-flex items-center justify-center p-2 text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600 border border-indigo-900/30 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teacher.id)}
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
                Showing Page {page} of {totalPages} ({filteredTeachers.length} entries)
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
                        {editingTeacher ? 'Edit Teacher Details' : 'Add New Teacher'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {editingTeacher ? 'Modify credential configurations' : 'Create linked user and teacher profile'}
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

                      {/* Username (Locked on edit) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Username
                        </label>
                        <input
                          type="text"
                          name="username"
                          required
                          disabled={!!editingTeacher || formLoading}
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          placeholder="e.g. jdoe"
                        />
                      </div>

                      {/* Password (Optional on edit) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Password {editingTeacher && '(Leave blank to keep unchanged)'}
                        </label>
                        <input
                          type="password"
                          name="password"
                          required={!editingTeacher}
                          disabled={formLoading}
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="••••••••"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          disabled={formLoading}
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. john@rawatclasses.com"
                        />
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            First Name
                          </label>
                          <input
                            type="text"
                            name="first_name"
                            disabled={formLoading}
                            value={formData.first_name}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Last Name
                          </label>
                          <input
                            type="text"
                            name="last_name"
                            disabled={formLoading}
                            value={formData.last_name}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-800 my-4 pt-4">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-4">Profile Details</span>
                      </div>

                      {/* Employee ID */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Employee ID (Unique)
                        </label>
                        <input
                          type="text"
                          name="employee_id"
                          required
                          disabled={formLoading}
                          value={formData.employee_id}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. TCH-001"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          required
                          disabled={formLoading}
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. +91 9876543210"
                        />
                      </div>

                      {/* Subject Spec & Qualification */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Subject specialty
                          </label>
                          <input
                            type="text"
                            name="subject_specialization"
                            required
                            disabled={formLoading}
                            value={formData.subject_specialization}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="e.g. Mathematics"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Qualification
                          </label>
                          <input
                            type="text"
                            name="qualification"
                            required
                            disabled={formLoading}
                            value={formData.qualification}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="e.g. M.Sc. Math"
                          />
                        </div>
                      </div>

                      {/* Joining Date */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Joining Date
                        </label>
                        <input
                          type="date"
                          name="joining_date"
                          required
                          disabled={formLoading}
                          value={formData.joining_date}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Is Active */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          disabled={formLoading}
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-semibold text-slate-350">
                          Mark as Active Staff Member
                        </label>
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
                        disabled={formLoading}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white text-sm transition flex items-center justify-center gap-2"
                      >
                        {formLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Profile</span>
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

export default Teachers;
