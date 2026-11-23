import React from 'react';

export const BackgroundOrbs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Top-Right Soft Accent Radial Glow */}
      <div
        className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(111, 180, 242, 0.45) 0%, rgba(191, 227, 250, 0.25) 50%, transparent 70%)',
        }}
      />
      {/* Bottom-Left Soft Ocean Glow */}
      <div
        className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(142, 197, 245, 0.35) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default BackgroundOrbs;
