import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

export const StatCard = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  gradient, // legacy prop retained for compatibility
  textColor,
  delay = 0,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`glass-card glass-hover relative overflow-hidden rounded-[20px] p-4 bg-white/75 backdrop-blur-[20px] border border-[#D5E9FA] flex flex-col justify-between min-w-0 shadow-[0_8px_30px_rgba(8,120,209,0.08)] transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 w-full">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-bold text-[#647C95] tracking-wider uppercase truncate">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-[#183653] tracking-tight tabular-nums truncate">
            <AnimatedCounter value={amount} isCurrency={true} />
          </h3>
          {subtitle && (
            <p className="text-[11px] font-medium text-[#647C95]/90 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] shadow-xs flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
