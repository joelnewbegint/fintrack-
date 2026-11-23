import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Reusable Ocean Blue EmptyState Component
 * - Friendly message
 * - One clear action button (accent pill)
 */
export const EmptyState = ({
  icon: Icon = Sparkles,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-card p-8 sm:p-12 text-center rounded-[24px] border border-white/90 space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-[#BFE3FA] border border-[#6FB4F2]/60 flex items-center justify-center mx-auto text-[#1F6FC8] shadow-sm">
        <Icon className="w-8 h-8 stroke-[2.2]" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-black text-ink tracking-tight">{title}</h3>
        {message && <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">{message}</p>}
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="btn-accent px-6 py-2.5 text-xs font-bold shadow-md active:scale-95 transition"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
