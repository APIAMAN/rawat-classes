import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import client from '../api/client';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';

const Students = () => {
  const toast = useToast();
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

  // Bulk CSV Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

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
    batches: [],
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
      toast.error('Failed to load student roster.');
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
    const today = new Date().toISOString().split('T')[0];
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
      date_of_birth: '2005-01-01',
      admission_date: today,
      is_active: true,
      batches: [],
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (student) => {
    setEditingStudent(student);
    setFormError(null);
    const activeBatchIds = student.enrollments
      ? student.enrollments.filter(e => e.is_active).map(e => e.batch)
      : [];

    setFormData({
      username: student.user.username,
      password: '',
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
      batches: activeBatchIds,
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

  const handleBatchToggle = (batchId) => {
    setFormData(prev => {
      const current = prev.batches;
      const exists = current.includes(batchId);
      return {
        ...prev,
        batches: exists ? current.filter(id => id !== batchId) : [...current, batchId]
      };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingStudent) {
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
        if (formData.password) payload.user.password = formData.password;

        const response = await client.put(`students/${editingStudent.id}/`, payload);
        setStudents(students.map(s => s.id === editingStudent.id ? response.data : s));
        setIsDrawerOpen(false);
        toast.success(`Updated profile for ${response.data.user.first_name || response.data.enrollment_no}`);
      } else {
        const response = await client.post('students/', formData);
        setStudents([response.data, ...students]);
        setIsDrawerOpen(false);
        toast.success(`Enrolled student ${response.data.user.first_name || response.data.enrollment_no}`);
      }
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0];
        const val = errData[firstKey];
        setFormError(`${firstKey}: ${Array.isArray(val) ? val[0] : JSON.stringify(val)}`);
      } else {
        setFormError('Failed to save student record. Verify enrollment number and username are unique.');
      }
      toast.error('Validation error. Check student form inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student record?')) return;
    try {
      await client.delete(`students/${id}/`);
      setStudents(students.filter(s => s.id !== id));
      toast.success('Student account deleted.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete student.');
    }
  };

  // CSV Bulk Upload Handlers
  const handleDownloadSampleCSV = () => {
    const sampleHeaders = "enrollment_no,first_name,last_name,email,phone,guardian_name,guardian_phone,date_of_birth,admission_date,batch_id\n";
    const sampleRow1 = "STU-2026-101,Rohan,Sharma,rohan@example.com,9876543210,Sanjay Sharma,9876543211,2006-05-15,2026-01-10,1\n";
    const sampleRow2 = "STU-2026-102,Ananya,Verma,ananya@example.com,9876543212,Priya Verma,9876543213,2006-08-20,2026-01-10,\n";
    const blob = new Blob([sampleHeaders + sampleRow1 + sampleRow2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'rawat_students_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUploadSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select a CSV file to upload.');
      return;
    }

    setBulkSubmitting(true);
    setBulkResult(null);

    const formDataUpload = new FormData();
    formDataUpload.append('file', bulkFile);

    try {
      const res = await client.post('students/bulk_upload/', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResult(res.data);
      toast.success(`Enrolled ${res.data.created_count} students via CSV upload.`);
      await fetchData();
    } catch (err) {
      const errRes = err.response?.data;
      setBulkResult(errRes || { detail: 'CSV upload failed.' });
      toast.error('Bulk upload completed with errors. Check summary below.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Filter & Pagination
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.user.first_name} ${student.user.last_name} ${student.user.username}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || student.enrollment_no.toLowerCase().includes(search.toLowerCase());
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' && student.is_active) || (activeFilter === 'inactive' && !student.is_active);

    let matchesBatch = true;
    if (batchFilter) {
      matchesBatch = student.enrollments && student.enrollments.some(e => e.is_active && String(e.batch) === String(batchFilter));
    }
    return matchesSearch && matchesActive && matchesBatch;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        subtitle="Manage student profiles, guardian records, and cohort class enrollments"
        badge={`${students.length} Total Enrolled`}
        actionButton={
          isAdmin ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsBulkModalOpen(true); setBulkResult(null); setBulkFile(null); }}
                className="btn-secondary flex items-center gap-2 text-xs"
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Bulk Upload CSV
              </button>
              <button onClick={openAddDrawer} className="btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Enroll Student
              </button>
            </div>
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
            placeholder="Search student, enrollment ID..."
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
            <option value="active">Active Students</option>
            <option value="inactive">Inactive Students</option>
          </select>

          <select
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
            className="input-base py-2.5"
          >
            <option value="">All Enrolled Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        headers={['Student & Enrollment', 'Enrolled Batches', 'Guardian Contact', 'Admission Date', 'Status', { label: 'Actions', align: 'right' }]}
        loading={loading}
        empty={filteredStudents.length === 0}
        emptyMessage="No students matching filter criteria."
        colSpan={6}
      >
        {paginatedStudents.map((student) => (
          <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-600/30 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs font-heading">
                  {(student.user.first_name || student.enrollment_no).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <Link to={`/students/${student.id}`} className="font-bold text-white hover:text-indigo-400 font-heading block">
                    {student.user.get_full_name || `${student.user.first_name} ${student.user.last_name}` || student.user.username}
                  </Link>
                  <span className="text-xs text-indigo-400 font-mono font-semibold">{student.enrollment_no}</span>
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex flex-wrap gap-1">
                {student.enrollments && student.enrollments.filter(e => e.is_active).length > 0 ? (
                  student.enrollments.filter(e => e.is_active).map(e => (
                    <span key={e.id} className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                      {e.batch_name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No Active Batches</span>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="text-xs font-semibold text-slate-200">{student.guardian_name}</div>
              <div className="text-xs text-slate-500">{student.guardian_phone}</div>
            </td>
            <td className="px-6 py-4 text-xs font-medium text-slate-400">
              {student.admission_date}
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                student.is_active 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${student.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/students/${student.id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="View Profile"
                >
                  👁️
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditDrawer(student)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                      title="Edit Profile"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Delete Record"
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

      {/* STUDENT DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-heading">
                    {editingStudent ? 'Edit Student Details' : 'Enroll New Student'}
                  </h2>
                  <button onClick={() => setIsDrawerOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {formError}
                  </div>
                )}

                <form id="studentForm" onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">First Name</label>
                      <input type="text" name="first_name" required value={formData.first_name} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Last Name</label>
                      <input type="text" name="last_name" required value={formData.last_name} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Enrollment No.</label>
                    <input type="text" name="enrollment_no" required placeholder="e.g. STU-2026-001" value={formData.enrollment_no} onChange={handleInputChange} className="input-base w-full font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Username</label>
                    <input type="text" name="username" required value={formData.username} onChange={handleInputChange} className="input-base w-full" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="input-base w-full" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                      {editingStudent ? 'New Password (Optional)' : 'Password'}
                    </label>
                    <input type="password" name="password" required={!editingStudent} value={formData.password} onChange={handleInputChange} className="input-base w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Student Phone</label>
                      <input type="text" name="phone" required value={formData.phone} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date of Birth</label>
                      <input type="date" name="date_of_birth" required value={formData.date_of_birth} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Guardian Name</label>
                      <input type="text" name="guardian_name" required value={formData.guardian_name} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Guardian Phone</label>
                      <input type="text" name="guardian_phone" required value={formData.guardian_phone} onChange={handleInputChange} className="input-base w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Admission Date</label>
                    <input type="date" name="admission_date" required value={formData.admission_date} onChange={handleInputChange} className="input-base w-full" />
                  </div>

                  {/* Multi-select batch checklist */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Enroll In Batches</label>
                    <div className="space-y-2 max-h-36 overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      {batches.map(b => (
                        <label key={b.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={formData.batches.includes(b.id)}
                            onChange={() => handleBatchToggle(b.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                          />
                          <span>{b.name} ({b.subject})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="s_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600" />
                    <label htmlFor="s_active" className="text-sm font-medium text-slate-300">Active Student Account</label>
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-3">
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" form="studentForm" disabled={formLoading} className="btn-primary flex-1">{formLoading ? 'Saving...' : editingStudent ? 'Save Profile' : 'Enroll Student'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK CSV UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white font-heading">Bulk Student CSV Upload</h3>
                <p className="text-xs text-indigo-400 font-semibold mt-0.5">Batch Register Multiple Accounts</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Need a sample format template?</span>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1"
              >
                📥 Download Template CSV
              </button>
            </div>

            <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition-all bg-slate-950/60">
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {bulkFile && (
                  <p className="text-xs text-emerald-400 font-semibold mt-2">
                    Selected: {bulkFile.name} ({Math.round(bulkFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              {/* Bulk Results Summary */}
              {bulkResult && (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-indigo-300 font-semibold">
                    {bulkResult.detail}
                  </div>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1 text-rose-300">
                      {bulkResult.errors.map((errText, idx) => (
                        <div key={idx}>• {errText}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="btn-primary flex-1"
                >
                  {bulkSubmitting ? 'Uploading...' : 'Upload & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
