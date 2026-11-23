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
  // Premium Ocean Blue Scheme Accents
  const configs = {
    daily: {
      colorName: 'Daily',
      border: 'hover:border-[#0878D1]',
      badge: 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]',
      accentBg: 'bg-gradient-to-tr from-[#0878D1] to-[#55B8F5]',
      textColor: 'text-[#0878D1]',
      icon: Clock,
      progressColor: 'bg-gradient-to-r from-[#0878D1] to-[#55B8F5]',
      shadow: 'hover:shadow-[#0878D1]/15',
    },
    weekly: {
      colorName: 'Weekly',
      border: 'hover:border-[#55B8F5]',
      badge: 'bg-[#EAF5FF] text-[#064B8E] border border-[#D5E9FA]',
      accentBg: 'bg-gradient-to-tr from-[#55B8F5] to-[#0878D1]',
      textColor: 'text-[#064B8E]',
      icon: Calendar,
      progressColor: 'bg-gradient-to-r from-[#55B8F5] to-[#0878D1]',
      shadow: 'hover:shadow-[#55B8F5]/20',
    },
    monthly: {
      colorName: 'Monthly',
      border: 'hover:border-[#18A879]',
      badge: 'bg-[#EAF5FF] text-[#18A879] border border-[#D5E9FA]',
      accentBg: 'bg-gradient-to-tr from-[#18A879] to-[#0878D1]',
      textColor: 'text-[#18A879]',
      icon: CalendarDays,
      progressColor: 'bg-gradient-to-r from-[#18A879] to-[#0878D1]',
      shadow: 'hover:shadow-[#18A879]/20',
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
      className={`bg-white/75 backdrop-blur-[20px] cursor-pointer rounded-2xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] transition-all ${cfg.border} ${cfg.shadow} relative overflow-hidden flex flex-col justify-between h-full min-w-0`}
    >
      {/* Top Scheme Banner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-2xl ${cfg.accentBg} text-white shadow-md border border-white/50`}>
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-[#183653] leading-tight">
              {title}
            </h4>
            <span className="text-[11px] text-[#647C95] font-medium">
              {subTitle}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${cfg.badge}`}>
          {activeLoans || 0} Loans
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#D5E9FA] text-center">
        <div>
          <p className="text-[11px] text-[#647C95] font-semibold uppercase tracking-wider">Lent</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-[#183653]">
            {formatCurrency(lent)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#18A879] font-semibold uppercase tracking-wider">Collected</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-[#18A879]">
            {formatCurrency(collected)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#0878D1] font-semibold uppercase tracking-wider">Pending</p>
          <p className="text-xs sm:text-sm font-black tabular-nums text-[#0878D1]">
            {formatCurrency(pending)}
          </p>
        </div>
      </div>

      {/* Recovery Rate Progress */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex justify-between items-center text-xs text-[#647C95]">
          <span className="font-medium">Recovery Rate (மீட்பு விகிதம்)</span>
          <span className="font-black tabular-nums text-[#183653]">{percentage}%</span>
        </div>
        <div className="w-full bg-[#EAF5FF] rounded-full h-2 overflow-hidden border border-[#D5E9FA]">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${cfg.progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#0878D1] hover:text-[#064B8E] transition">
          <span>View filtered loans</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default FinanceTypeCard;
