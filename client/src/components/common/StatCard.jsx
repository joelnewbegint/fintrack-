import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

export const StatCard = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  gradient = 'from-sky-400 to-sky-500',
  textColor,
  delay = 0,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`glass glass-hover relative overflow-hidden rounded-2xl p-3.5 sm:p-4 border border-white/80 dark:border-sky-800/40 transition-all flex flex-col justify-between min-w-0 shadow-sm hover:shadow-md ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 w-full">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase truncate">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
            <AnimatedCounter value={amount} isCurrency={true} />
          </h3>
          {subtitle && (
            <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr ${gradient} text-white shadow-md flex items-center justify-center shrink-0 border border-white/50`}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
