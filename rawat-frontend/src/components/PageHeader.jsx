import React from 'react';

const PageHeader = ({ title, subtitle, badge, actionButton, children }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-slate-400 text-sm max-w-2xl">{subtitle}</p>}
      </div>
      {(actionButton || children) && (
        <div className="flex items-center gap-3 shrink-0">
          {actionButton}
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
