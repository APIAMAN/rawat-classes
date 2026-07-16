import React from 'react';

const DataTable = ({
  headers,
  loading,
  empty,
  emptyMessage = "No matching records found.",
  children,
  colSpan = 6,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-heading">
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 font-bold ${
                    typeof h === 'object' && h.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {typeof h === 'object' ? h.label : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {loading ? (
              // Skeleton Loading Rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {Array.from({ length: headers.length }).map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <div className="h-4 bg-slate-800/80 rounded-lg w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : empty ? (
              // Vector Empty State
              <tr>
                <td colSpan={colSpan || headers.length} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400">
                      <svg className="w-7 h-7 text-indigo-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium text-sm max-w-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
