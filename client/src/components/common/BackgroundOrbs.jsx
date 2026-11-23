import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundOrbs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Top-Right Soft Accent Radial Glow */}
      <div
        className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(255, 201, 77, 0.45) 0%, rgba(255, 231, 168, 0.25) 50%, transparent 70%)',
        }}
      />
      {/* Bottom-Left Soft Apricot Glow */}
      <div
        className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(255, 201, 160, 0.40) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default BackgroundOrbs;
