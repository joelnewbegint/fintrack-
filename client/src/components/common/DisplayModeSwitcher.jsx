import React from 'react';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { Smartphone, Tablet, Laptop, Sparkles, RotateCcw } from 'lucide-react';

export const DisplayModeSwitcher = ({ compact = false, showLabel = true }) => {
  const { mode, activeDevice, isOverride, setMode, resetToAuto, isRealPhone } = useDeviceMode();

  if (isRealPhone) return null;

  const options = [
    { id: 'mobile', label: 'Mobile', icon: Smartphone, hint: '< 768px' },
    { id: 'tablet', label: 'Tablet', icon: Tablet, hint: '768 - 1199px' },
    { id: 'laptop', label: 'Laptop', icon: Laptop, hint: '≥ 1200px' },
  ];

  return (
    <div className="flex items-center space-x-1.5">
      <div className="flex items-center p-1 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 shadow-sm">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = mode === opt.id;
          const isActiveSimulated = activeDevice === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
                  : isActiveSimulated && !isOverride
                  ? 'bg-sky-100/70 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-white/40 dark:hover:bg-sky-950/40'
              }`}
              title={`${opt.label} Mode (${opt.hint})`}
              aria-label={`${opt.label} Display Mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              {!compact && showLabel && <span className="hidden sm:inline">{opt.label}</span>}
            </button>
          );
        })}

        {/* Auto Option */}
        <button
          onClick={() => setMode('auto')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            mode === 'auto'
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
          }`}
          title="Auto Detect screen size"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          {!compact && showLabel && <span className="hidden sm:inline">Auto</span>}
        </button>
      </div>

      {/* Reset to Auto Pill if override is active */}
      {isOverride && (
        <button
          onClick={resetToAuto}
          className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition active:scale-95"
          title="Reset to Auto Screen Detection"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
        </button>
      )}
    </div>
  );
};

export default DisplayModeSwitcher;
