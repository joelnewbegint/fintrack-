import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/currency';
import { ArrowRight, Calendar, Clock, CalendarDays } from 'lucide-react';

export const FinanceTypeCard = ({
  type, // 'daily' | 'weekly' | 'monthly'
  title,
  subTitle,
  activeLoans,
  lent,
  collected,
  pending,
  onClick,
}) => {
  // Soft harmonized finance accents: Daily = #F59E0B amber, Weekly = #0EA5E9 sky, Monthly = #14B8A6 teal
  const configs = {
    daily: {
      colorName: 'Daily',
      border: 'hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50',
      accentBg: 'bg-gradient-to-tr from-amber-500 to-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      icon: Clock,
      progressColor: 'bg-[#F59E0B]',
      shadow: 'hover:shadow-amber-500/15',
    },
    weekly: {
      colorName: 'Weekly',
      border: 'hover:border-sky-400',
      badge: 'bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/50',
      accentBg: 'bg-gradient-to-tr from-sky-500 to-sky-400',
      textColor: 'text-sky-600 dark:text-sky-400',
      icon: Calendar,
      progressColor: 'bg-[#0EA5E9]',
      shadow: 'hover:shadow-sky-500/20',
    },
    monthly: {
      colorName: 'Monthly',
      border: 'hover:border-teal-400',
      badge: 'bg-teal-100 text-teal-900 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300/50',
      accentBg: 'bg-gradient-to-tr from-teal-500 to-teal-400',
      textColor: 'text-teal-600 dark:text-teal-400',
      icon: CalendarDays,
      progressColor: 'bg-[#14B8A6]',
      shadow: 'hover:shadow-teal-500/20',
    },
  };

  const cfg = configs[type] || configs.daily;
  const Icon = cfg.icon;

  const total = (collected || 0) + (pending || 0);
  const percentage = total > 0 ? Math.round(((collected || 0) / total) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`glass glass-hover cursor-pointer rounded-2xl p-5 border border-white/70 dark:border-sky-800/40 transition-all ${cfg.border} ${cfg.shadow} relative overflow-hidden`}
    >
      {/* Top Scheme Banner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-2xl ${cfg.accentBg} text-white shadow-md border border-white/40`}>
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              {title}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {subTitle}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${cfg.badge}`}>
          {activeLoans || 0} Loans
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 py-3 border-y border-sky-100/80 dark:border-sky-900/40 text-center">
        <div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Lent</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-slate-800 dark:text-slate-200">
            {formatCurrency(lent)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Collected</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(collected)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Pending</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
            {formatCurrency(pending)}
          </p>
        </div>
      </div>

      {/* Recovery Rate Progress */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Recovery Rate (மீட்பு விகிதம்)</span>
          <span className="font-black tabular-nums text-slate-800 dark:text-slate-200">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-sky-950/60 rounded-full h-2 overflow-hidden border border-white/40 dark:border-sky-800/40">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${cfg.progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="pt-2 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition">
          <span>View filtered loans</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default FinanceTypeCard;
