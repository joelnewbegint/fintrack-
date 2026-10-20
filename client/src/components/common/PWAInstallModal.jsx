import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '../../context/PWAContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const PWAInstallModal = () => {
  const { showInstallModal, setShowInstallModal, isIOS, promptInstall } = usePWA();
  const { lang } = useLanguage();

  if (!showInstallModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
        <div
          className="fixed inset-0"
          onClick={() => setShowInstallModal(false)}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative glass-panel rounded-3xl p-6 border border-white/80 dark:border-sky-800/60 shadow-2xl max-w-md w-full space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              <img
                src="/icon-192.png"
                alt="VK Banker's"
                className="w-14 h-14 rounded-2xl shadow-md border border-white/80 dark:border-sky-700/60 object-cover"
              />
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  VK BANKER'S
                </h3>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-bold">
                  {lang === 'ta' ? 'தவணை நிதி மேலாண்மை செயலி' : 'Finance Management App'}
                </p>
                <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'ta' ? 'நிறுவக்கூடிய PWA செயலி' : 'Installable PWA Application'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="p-2 rounded-xl glass hover:bg-sky-100 dark:hover:bg-sky-950 text-slate-400 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* iOS Specific Instructions */}
          {isIOS ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 space-y-1">
                <p className="text-xs font-bold text-sky-800 dark:text-sky-200">
                  {lang === 'ta'
                    ? 'Apple iPhone / iPad-ல் நிறுவும் முறை:'
                    : 'How to install on iPhone & iPad:'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'ta'
                    ? 'Safari உலாவியில் 3 எளிய படிகளில் முகப்புத் திரையில் சேர்க்கலாம்'
                    : 'Follow these 3 quick steps in Safari to add to your Home Screen'}
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {/* Step 1 */}
                <div className="flex items-start space-x-3 p-3 rounded-2xl glass border border-sky-100 dark:border-sky-900/40">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center space-x-1.5">
                      <span>{lang === 'ta' ? 'பகிர்வு பொத்தானைத் தொடவும்' : 'Tap the Share Button'}</span>
                      <Share className="w-4 h-4 text-sky-500 inline" />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'ta'
                        ? 'Safari திரையின் கீழே அல்லது மேலே உள்ள Share பொத்தானை கிளிக் செய்யவும்.'
                        : 'Tap the Share icon at the bottom of Safari navigation bar.'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3 p-3 rounded-2xl glass border border-sky-100 dark:border-sky-900/40">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center space-x-1.5">
                      <span>{lang === 'ta' ? 'Add to Home Screen என்பதைத் தேர்ந்தெடுக்கவும்' : 'Select "Add to Home Screen"'}</span>
                      <PlusSquare className="w-4 h-4 text-sky-500 inline" />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'ta'
                        ? 'கீழே ஸ்க்ரோல் செய்து "Add to Home Screen" (முகப்புத் திரையில் சேர்) என்பதை கிளிக் செய்யவும்.'
                        : 'Scroll down the share options list and choose "Add to Home Screen".'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3 p-3 rounded-2xl glass border border-sky-100 dark:border-sky-900/40">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {lang === 'ta' ? 'வலது மேல் மூலையில் "Add" என்பதைத் தொடவும்' : 'Tap "Add" in Top-Right'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'ta'
                        ? 'VK BANKER\'S செயலி உங்கள் மொபைல் திரையில் நிறுவப்படும்!'
                        : 'The app icon will now appear on your home screen with zero browser bars!'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/25 active:scale-98 transition"
              >
                {lang === 'ta' ? 'புரிந்தது / சரி' : 'Got It, Thanks!'}
              </button>
            </div>
          ) : (
            /* Android / Desktop Instructions */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {lang === 'ta'
                  ? 'VK BANKER\'S செயலியை உங்கள் சாதனத்தில் நிறுவி, உலாவியின் முகவரி பட்டை இல்லாமல் முழுத்திரை அனுபவத்துடன் பயன்படுத்தலாம்.'
                  : 'Install VK BANKER\'S on your device for fast access, native app window, and reliable performance without address bars.'}
              </p>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'ta' ? 'மொபைல் முகப்புத் திரையில் நேரடி ஐகான்' : 'Instant launcher icon on desktop & mobile'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'ta' ? 'விரைவான சுமை & ஆஃப்லைன் ஆதரவு' : 'Fast loading and offline shell caching'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'ta' ? 'பாதுகாப்பான நேரலை வங்கித் தரவு' : 'End-to-end encrypted financial ledger'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-1/2 py-2.5 rounded-xl glass font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {lang === 'ta' ? 'பிறகு' : 'Later'}
                </button>
                <button
                  onClick={() => {
                    setShowInstallModal(false);
                    promptInstall();
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/25 flex items-center justify-center space-x-1.5 active:scale-98 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'ta' ? 'நிறுவுக (Install)' : 'Install App'}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PWAInstallModal;
