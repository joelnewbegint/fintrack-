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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`glass glass-hover relative overflow-hidden rounded-2xl p-5 border border-white/70 dark:border-sky-800/40 transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Decorative gradient glow circle */}
      <div
        className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-20 blur-2xl bg-gradient-to-tr ${gradient}`}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1 z-10">
          <p className="text-xs font-bold text-sky-800/70 dark:text-sky-300/80 tracking-wide uppercase">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            <AnimatedCounter value={amount} isCurrency={true} />
          </h3>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`p-3.5 rounded-2xl bg-gradient-to-tr ${gradient} text-white shadow-lg shadow-sky-500/25 border border-white/40 flex items-center justify-center shrink-0`}
        >
          <Icon className="w-6 h-6 stroke-[2]" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
