import React from 'react';

const Fees = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Fees & Billing</h1>
      <p className="text-slate-400 text-sm">Review transaction history, pending dues, and invoices.</p>
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-slate-500 text-center py-12">
        Invoice histories and billing summaries will be loaded here.
      </div>
    </div>
  );
};

export default Fees;
