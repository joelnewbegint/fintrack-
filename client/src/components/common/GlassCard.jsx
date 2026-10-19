import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({
  children,
  className = '',
  hover = true,
  glow = false,
  onClick,
  animated = false,
  delay = 0,
  ...props
}) => {
  const baseClasses = `glass rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ${
    hover ? 'glass-hover cursor-pointer' : ''
  } ${
    glow ? 'ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/20' : ''
  } ${className}`;

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        className={baseClasses}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export default GlassCard;
