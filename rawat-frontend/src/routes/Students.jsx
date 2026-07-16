import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';

const Students = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Form Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    enrollment_no: '',
    phone: '',
    guardian_name: '',
    guardian_phone: '',
    date_of_birth: '',
    admission_date: '',
    is_active: true,
    batches: [], // list of batch IDs
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        client.get('students/'),
        client.get('batches/'),
      ]);
      setStudents(studentsRes.data);
      setBatches(batchesRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddDrawer = () => {
    setEditingStudent(null);
    setFormError(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      first_name: '',
      last_name: '',
      enrollment_no: '',
      phone: '',
      guardian_name: '',
      guardian_phone: '',
      date_of_birth: '',
      admission_date: new Date().toISOString().split('T')[0],
      is_active: true,
      batches: [],
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (student) => {
    setEditingStudent(student);
    setFormError(null);
    setFormData({
      username: student.user.username,
      password: '', // keep blank to leave unchanged
      email: student.user.email,
      first_name: student.user.first_name,
      last_name: student.user.last_name,
      enrollment_no: student.enrollment_no,
      phone: student.phone,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      date_of_birth: student.date_of_birth,
      admission_date: student.admission_date,
      is_active: student.is_active,
      batches: student.enrollments.filter(e => e.is_active).map(e => e.batch),
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

  const handleBatchCheckboxChange = (batchId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        batches: [...formData.batches, batchId],
      });
    } else {
      setFormData({
        ...formData,
        batches: formData.batches.filter(id => id !== batchId),
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingStudent) {
        // Edit payload
        const payload = {
          user: {
            username: formData.username,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
          },
          enrollment_no: formData.enrollment_no,
          phone: formData.phone,
          guardian_name: formData.guardian_name,
          guardian_phone: formData.guardian_phone,
          date_of_birth: formData.date_of_birth,
          admission_date: formData.admission_date,
          is_active: formData.is_active,
          batches: formData.batches,
        };
        if (formData.password) {
          payload.user.password = formData.password;
        }

        const response = await client.put(`students/${editingStudent.id}/`, payload);
        setStudents(students.map(s => s.id === editingStudent.id ? response.data : s));
        setIsDrawerOpen(false);
      } else {
        // Create student
        const response = await client.post('students/', formData);
        setStudents([response.data, ...students]);
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
        setFormError('Failed to save student. Ensure all unique constraints are met.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student and delete their associated user account?')) {
      return;
    }
    try {
      await client.delete(`students/${id}/`);
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete student.');
    }
  };

  // Filter & Search
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.user.first_name} ${student.user.last_name} ${student.user.username}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || student.enrollment_no.toLowerCase().includes(search.toLowerCase());

    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && student.is_active) || 
      (activeFilter === 'inactive' && !student.is_active);

    const matchesBatch = !batchFilter || student.enrollments.some(e => e.batch === parseInt(batchFilter) && e.is_active);

    return matchesSearch && matchesActive && matchesBatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const formatEnrollments = (enrollments) => {
    const active = enrollments.filter(e => e.is_active);
    if (active.length === 0) return 'No batches enrolled';
    return active.map(e => e.batch_name).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">Students Roster</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage admissions, guardian records, and class allocations</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddDrawer}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Student
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by student name or enrollment no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-150"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Active status */}
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Batch filter */}
          <select
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px]"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center text-rose-400">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-slate-900/10 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          No students found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Enrollment ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Guardian Details</th>
                    <th className="px-6 py-4">Enrolled Batches</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="px-6 py-4 font-mono text-slate-400">{student.enrollment_no}</td>
                      <td className="px-6 py-4">
                        <Link to={`/students/${student.id}`} className="font-semibold text-slate-200 hover:text-indigo-400">
                          {`${student.user.first_name} ${student.user.last_name}`}
                        </Link>
                        <span className="block text-xs text-slate-500 mt-0.5">@{student.user.username}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{student.phone}</td>
                      <td className="px-6 py-4">
                        <span className="text-slate-200 block text-xs font-semibold">{student.guardian_name}</span>
                        <span className="text-[10px] text-slate-500 block">{student.guardian_phone}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400 max-w-[200px] truncate block">
                          {formatEnrollments(student.enrollments)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.is_active ? (
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
                          to={`/students/${student.id}`}
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
                              onClick={() => openEditDrawer(student)}
                              className="inline-flex items-center justify-center p-2 text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600 border border-indigo-900/30 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
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
                Showing Page {page} of {totalPages} ({filteredStudents.length} entries)
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
                        {editingStudent ? 'Edit Student Details' : 'Register New Student'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {editingStudent ? 'Modify credential configurations and enrollments' : 'Create user and map details'}
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
                          disabled={!!editingStudent || formLoading}
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          placeholder="e.g. ssmith"
                        />
                      </div>

                      {/* Password (Optional on edit) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Password {editingStudent && '(Leave blank to keep unchanged)'}
                        </label>
                        <input
                          type="password"
                          name="password"
                          required={!editingStudent}
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
                          placeholder="e.g. sam@gmail.com"
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
                            placeholder="Sam"
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
                            placeholder="Smith"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-800 my-4 pt-4">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-4">Registration & Profile Details</span>
                      </div>

                      {/* Enrollment No */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Enrollment Number (Unique)
                        </label>
                        <input
                          type="text"
                          name="enrollment_no"
                          required
                          disabled={formLoading}
                          value={formData.enrollment_no}
                          onChange={handleInputChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. STU-2026-001"
                        />
                      </div>

                      {/* Contact fields */}
                      <div className="grid grid-cols-2 gap-4">
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
                            placeholder="e.g. +91 9999988888"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            name="date_of_birth"
                            required
                            disabled={formLoading}
                            value={formData.date_of_birth}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Admission Date & Active */}
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Admission Date
                          </label>
                          <input
                            type="date"
                            name="admission_date"
                            required
                            disabled={formLoading}
                            value={formData.admission_date}
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
                            Active Student
                          </label>
                        </div>
                      </div>

                      {/* Guardian information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Guardian Name
                          </label>
                          <input
                            type="text"
                            name="guardian_name"
                            required
                            disabled={formLoading}
                            value={formData.guardian_name}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="Father/Mother name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Guardian Phone
                          </label>
                          <input
                            type="text"
                            name="guardian_phone"
                            required
                            disabled={formLoading}
                            value={formData.guardian_phone}
                            onChange={handleInputChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="Parent contact number"
                          />
                        </div>
                      </div>

                      {/* Multi-Select Batch Enrollment */}
                      <div className="border-t border-slate-800 my-4 pt-4 space-y-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Enroll in Batches</span>
                        {batches.filter(b => b.is_active).length === 0 ? (
                          <div className="text-xs text-amber-500 border border-amber-905/30 bg-amber-95/20 rounded-xl p-3">
                            No active batches found. Enrolling can be set up once batches are defined.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto bg-slate-950 border border-slate-850 p-3 rounded-xl pr-1">
                            {batches.filter(b => b.is_active).map((b) => (
                              <label key={b.id} className="flex items-center gap-2 hover:bg-slate-900/40 p-1.5 rounded-lg cursor-pointer transition select-none">
                                <input
                                  type="checkbox"
                                  checked={formData.batches.includes(b.id)}
                                  onChange={(e) => handleBatchCheckboxChange(b.id, e.target.checked)}
                                  disabled={formLoading}
                                  className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-300 font-medium truncate block max-w-[140px]">
                                  {b.name}
                                </span>
                              </label>
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
                        disabled={formLoading}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white text-sm transition flex items-center justify-center gap-2"
                      >
                        {formLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Student</span>
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

export default Students;
