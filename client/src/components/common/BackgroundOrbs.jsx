import React from 'react';
import { motion } from 'framer-motion';
import { useComfort } from '../../context/ComfortContext';

export const BackgroundOrbs = () => {
  const { reducedMotion } = useComfort();

  if (reducedMotion) {
    // Static orbs for reduced motion
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-300/30 dark:bg-sky-500/15 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-sky-400/25 dark:bg-sky-600/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-teal-300/20 dark:bg-teal-500/10 blur-3xl" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Orb 1: Top-Left Sky Blue */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -35, 25, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-300/35 dark:bg-sky-500/20 blur-3xl"
      />

      {/* Orb 2: Right Center Sky Accent */}
      <motion.div
        animate={{
          x: [0, -45, 25, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-sky-400/25 dark:bg-sky-600/15 blur-3xl"
      />

      {/* Orb 3: Bottom Left Soft Teal/Sky */}
      <motion.div
        animate={{
          x: [0, 30, -35, 0],
          y: [0, -25, 35, 0],
          scale: [1, 1.05, 0.96, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-sky-200/30 dark:bg-teal-600/15 blur-3xl"
      />
    </div>
  );
};

export default BackgroundOrbs;
