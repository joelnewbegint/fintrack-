import React from 'react';
import { useComfort } from '../../context/ComfortContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Type,
  LayoutGrid,
  Sun,
  Moon,
  Sparkles,
  Smartphone,
  Tablet,
  Laptop,
  Check,
  RotateCcw,
  Zap,
  Globe,
  Sliders,
  Eye,
} from 'lucide-react';

export const ComfortSettings = () => {
  const {
    textSize,
    setTextSize,
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    themeMode,
    setThemeMode,
  } = useComfort();

  const { mode, activeDevice, isOverride, setMode, resetToAuto } = useDeviceMode();
  const { lang, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 border border-white/70 dark:border-sky-800/40 shadow-lg space-y-6">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-sky-500" />
            <span>Comfort & Display Settings / பார்வை & வசதி அமைப்புகள்</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            எழுத்து அளவு, திரை வடிவம், வண்ண தீம் ஆகியவற்றை உங்கள் வசதிக்கேற்ப மாற்றி அமைக்கலாம்.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Column */}
          <div className="space-y-5">
            {/* 1. Text Size */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <Type className="w-4 h-4 text-sky-500" />
                <span>Text Size / எழுத்து அளவு</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal', tamil: 'சாதாரணம்' },
                  { id: 'large', label: 'Large', tamil: 'பெரியது' },
                  { id: 'xl', label: 'Extra Large', tamil: 'மிகப் பெரியது' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTextSize(s.id)}
                    className={`min-h-[48px] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      textSize === s.id
                        ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black shadow-md shadow-sky-500/30 ring-2 ring-sky-300'
                        : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                    }`}
                  >
                    <span className="text-xs font-bold">{s.label}</span>
                    <span className="text-[10px] opacity-80">{s.tamil}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Density */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <LayoutGrid className="w-4 h-4 text-sky-500" />
                <span>Density / இடைவெளி அளவு</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'comfortable', label: 'Comfortable', tamil: 'நடுத்தர இடைவெளி' },
                  { id: 'compact', label: 'Compact', tamil: 'குறைந்த இடைவெளி' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDensity(d.id)}
                    className={`min-h-[48px] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      density === d.id
                        ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black shadow-md shadow-sky-500/30 ring-2 ring-sky-300'
                        : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                    }`}
                  >
                    <span className="text-xs font-bold">{d.label}</span>
                    <span className="text-[10px] opacity-80">{d.tamil}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Theme Mode */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <Sun className="w-4 h-4 text-sky-500" />
                <span>Theme Mode / வண்ண தீம்</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Light', icon: Sun, tamil: 'பகல்' },
                  { id: 'dark', label: 'Dark', icon: Moon, tamil: 'இரவு' },
                  { id: 'auto', label: 'Auto', icon: Sparkles, tamil: 'கணினி வழி' },
                ].map((th) => {
                  const Icon = th.icon;
                  return (
                    <button
                      key={th.id}
                      onClick={() => setThemeMode(th.id)}
                      className={`min-h-[48px] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        themeMode === th.id
                          ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black shadow-md shadow-sky-500/30 ring-2 ring-sky-300'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold">{th.label}</span>
                      <span className="text-[10px] opacity-80">{th.tamil}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Display Mode (Device Switcher) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <Laptop className="w-4 h-4 text-sky-500" />
                  <span>Display Mode / திரை வடிவம்</span>
                </label>
                {isOverride && (
                  <button
                    onClick={resetToAuto}
                    className="flex items-center space-x-1 text-[11px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Auto</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'auto', label: 'Auto', icon: Sparkles },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone },
                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                  { id: 'laptop', label: 'Laptop', icon: Laptop },
                ].map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setMode(d.id)}
                      className={`min-h-[48px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        mode === d.id
                          ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black shadow-md shadow-sky-500/30 ring-2 ring-sky-300'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      <span className="text-[11px] font-bold">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Reduced Motion Toggle */}
            <div className="p-4 rounded-2xl glass border border-sky-100 dark:border-sky-800/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Reduce Motion / அசைவுகளைக் குறை</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  பயன்பாட்டின் வேகம் மற்றும் பேட்டரியை சேமிக்க அனிமேஷன்களை நிறுத்தும்.
                </p>
              </div>

              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  reducedMotion ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle Reduced Motion"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    reducedMotion ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 6. Language */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-sky-500" />
                <span>Language / மொழி</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ta', label: 'தமிழ் (Tamil)' },
                  { id: 'en', label: 'English' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`min-h-[48px] p-2.5 rounded-2xl font-bold text-xs transition-all ${
                      lang === l.id
                        ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-300'
                        : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Preview Card */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-sky-500" />
              <span>Live Preview / நேரடி முன்னோட்டம்</span>
            </div>

            <div className="p-6 rounded-3xl glass border-2 border-sky-400/50 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black text-[10px] rounded-bl-2xl shadow-sm">
                FinTrack Realtime Demo
              </div>

              {/* Mock Loan Card */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white leading-tight">
                    {lang === 'ta' ? 'முத்துக்கிருஷ்ணன் (மளிகை கடை)' : 'Muthukrishnan (Grocery Store)'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Loan #DL-1004 • Gandhipuram, CBE
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-black border border-emerald-300/40">
                  {lang === 'ta' ? 'செயலில் உள்ளது' : 'Active'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-sky-100 dark:border-sky-900/40 text-center">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Lent</p>
                  <p className="font-black tabular-nums text-slate-800 dark:text-slate-200">
                    ₹ 50,000
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-600 font-medium">Daily Installment</p>
                  <p className="font-black tabular-nums text-emerald-600">
                    ₹ 500
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-sky-600 font-medium">Due Date</p>
                  <p className="font-black text-sky-600">
                    Today
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Recovery (80%)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">40 / 50 Days</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-sky-950/60 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#F59E0B] h-2.5 rounded-full w-4/5" />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button className="flex-1 btn-sky-primary py-2.5 text-xs font-black shadow-md">
                  {lang === 'ta' ? '+ வசூல் பதிவு செய்' : '+ Record Payment'}
                </button>
                <button className="flex-1 btn-sky-secondary py-2.5 text-xs font-bold">
                  {lang === 'ta' ? 'வாட்ஸ்அப் நினைவூட்டல்' : 'WhatsApp Reminder'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-300">
              💡 <strong>குறிப்பு:</strong> நீங்கள் செய்யும் மாற்றங்கள் உடனடியாக முழு பயன்பாட்டிலும் பயன்பாட்டுக்கு வரும். சேமிக்க வேண்டிய அவசியம் இல்லை.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComfortSettings;
