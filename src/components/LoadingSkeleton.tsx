import React from 'react';
import { Loader2 } from 'lucide-react';

interface CircularProgressProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CircularProgress({ label = 'Loading data...', size = 'md', className = '' }: CircularProgressProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-14 w-14 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 space-y-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className={`animate-spin rounded-full border-teal-500/20 border-t-teal-600 ${sizeClasses[size]}`} />
        <Loader2 className="h-5 w-5 text-teal-600 animate-spin absolute" />
      </div>
      {label && (
        <p className="text-xs font-semibold text-slate-500 animate-pulse tracking-wide">
          {label}
        </p>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 p-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="h-5 w-40 bg-slate-200 rounded-lg"></div>
        <div className="h-8 w-24 bg-slate-100 rounded-xl"></div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className={`h-4 bg-slate-100 rounded-md ${cIdx === 0 ? 'w-28 bg-slate-200' : 'w-16'}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 w-20 bg-slate-200 rounded-md"></div>
            <div className="h-8 w-8 bg-slate-100 rounded-full"></div>
          </div>
          <div className="h-7 w-28 bg-slate-200 rounded-lg"></div>
          <div className="h-3 w-32 bg-slate-100 rounded-md"></div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-200 rounded"></div>
          <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
          <div className="h-24 w-full bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export function TabContentSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
