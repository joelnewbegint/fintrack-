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
      className={`glass-card glass-hover relative overflow-hidden rounded-[20px] p-4 bg-white/75 border border-white/95 flex flex-col justify-between min-w-0 shadow-golden transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 w-full">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-bold text-muted tracking-wider uppercase truncate">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-ink tracking-tight tabular-nums truncate">
            <AnimatedCounter value={amount} isCurrency={true} />
          </h3>
          {subtitle && (
            <p className="text-[11px] font-medium text-muted/80 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="w-10 h-10 rounded-full bg-[#FFE7A8] border border-[#FFC94D]/60 text-[#C88A00] shadow-sm flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
