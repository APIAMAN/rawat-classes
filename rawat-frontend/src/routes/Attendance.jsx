import React from 'react';

const Attendance = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Attendance Tracking</h1>
      <p className="text-slate-400 text-sm">Monitor check-in details, absentees, and weekly averages.</p>
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-slate-500 text-center py-12">
        Daily attendance sheets and registers will be loaded here.
      </div>
    </div>
  );
};

export default Attendance;
