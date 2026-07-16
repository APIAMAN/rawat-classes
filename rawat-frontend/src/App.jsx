import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Routes / Pages
import Login from './routes/Login';
import Dashboard from './routes/Dashboard';
import Teachers from './routes/Teachers';
import TeacherDetail from './routes/TeacherDetail';
import Batches from './routes/Batches';
import BatchDetail from './routes/BatchDetail';
import Students from './routes/Students';
import StudentDetail from './routes/StudentDetail';
import Attendance from './routes/Attendance';
import Fees from './routes/Fees';

function App() {
  const dispatch = useDispatch();
  const { status } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check if user session is active on startup (using httpOnly cookie)
    dispatch(checkAuth());
  }, [dispatch]);

  if (status === 'idle') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-500 text-sm font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected workspace Layout (for Admins, Teachers, and Students) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/teachers" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}><Teachers /></ProtectedRoute>
          } />
          <Route path="/teachers/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}><TeacherDetail /></ProtectedRoute>
          } />
          
          <Route path="/batches" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}><Batches /></ProtectedRoute>
          } />
          <Route path="/batches/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}><BatchDetail /></ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}><Students /></ProtectedRoute>
          } />
          <Route path="/students/:id" element={<StudentDetail />} />

          {/* Admin-only specific subpages */}
          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['admin']}><Attendance /></ProtectedRoute>
          } />
          <Route path="/fees" element={
            <ProtectedRoute allowedRoles={['admin']}><Fees /></ProtectedRoute>
          } />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
