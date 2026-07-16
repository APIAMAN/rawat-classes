import React from 'react';

const Students = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Students Management</h1>
      <p className="text-slate-400 text-sm">Review student enrollment details, profiles, and historical records.</p>
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-slate-500 text-center py-12">
        Student lists and details will be loaded here.
      </div>
    </div>
  );
};

export default Students;
