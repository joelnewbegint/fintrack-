import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Cloud,
  AlertCircle,
  Info,
  X,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ToastContext = createContext(null);

/**
 * Toast types configuration with WCAG AA compliant colors & status tokens
 */
const TOAST_CONFIG = {
  saved: {
    icon: CheckCircle2,
    bgClass: 'bg-[#DDF0E6]/90 border-[#2F7D5B]/30 text-[#2F7D5B]',
    iconColor: 'text-[#2F7D5B]',
    defaultTitleEn: 'Saved Successfully',
    defaultTitleTa: 'வெற்றிகரமாக சேமிக்கப்பட்டது',
  },
  synced: {
    icon: RefreshCw,
    bgClass: 'bg-[#CFE6F2]/90 border-[#1F4E6B]/30 text-[#1F4E6B]',
    iconColor: 'text-[#1F4E6B]',
    defaultTitleEn: 'Cloud Synced',
    defaultTitleTa: 'மேகக்கணியுடன் இணைக்கப்பட்டது',
  },
  'offline-queued': {
    icon: Cloud,
    bgClass: 'bg-[#E3DBF4]/90 border-[#4B3C8A]/30 text-[#4B3C8A]',
    iconColor: 'text-[#4B3C8A]',
    defaultTitleEn: 'Saved Offline (Will Sync When Online)',
    defaultTitleTa: 'ஆஃப்லைனில் சேமிக்கப்பட்டது (இணையம் வந்ததும் ஒத்திசைக்கப்படும்)',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-[#FBE3DC]/90 border-[#A8442C]/30 text-[#A8442C]',
    iconColor: 'text-[#A8442C]',
    defaultTitleEn: 'Action Failed',
    defaultTitleTa: 'செயல்பாடு தோல்வியடைந்தது',
  },
  info: {
    icon: Info,
    bgClass: 'bg-[#E3DBF4]/90 border-[#4B3C8A]/30 text-[#4B3C8A]',
    iconColor: 'text-[#4B3C8A]',
    defaultTitleEn: 'Information',
    defaultTitleTa: 'தகவல்',
  },
};

/**
 * Toast Container & Provider
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { lang } = useLanguage ? useLanguage() : { lang: 'en' };

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  // Global event listener: Allows triggering toasts from anywhere via window.dispatchEvent
  useEffect(() => {
    const handleCustomToast = (event) => {
      if (event.detail) {
        addToast(event.detail);
      }
    };

    window.addEventListener('fintrack:toast', handleCustomToast);
    return () => window.removeEventListener('fintrack:toast', handleCustomToast);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Top-Right Glass Toasts Container */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
          const Icon = config.icon;
          const title =
            toast.title ||
            (lang === 'ta' ? config.defaultTitleTa : config.defaultTitleEn);

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-2xl backdrop-blur-xl border shadow-lg transition-all duration-180 ease-out transform animate-in slide-in-from-top-2 fade-in ${config.bgClass}`}
              style={{
                boxShadow: '0 8px 24px rgba(139, 123, 208, 0.16)',
              }}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />

              <div className="flex-1 min-w-0 pr-1">
                <p className="font-medium text-xs tracking-tight leading-snug">
                  {title}
                </p>
                {toast.message && (
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-1 rounded-lg transition active:scale-95 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback helper if used outside provider
    return {
      addToast: (detail) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fintrack:toast', { detail }));
        }
      },
      removeToast: () => {},
    };
  }
  return context;
};

/**
 * Friendly Glass Empty State Component
 * Features subtle glass container, friendly icon, and one clear action button
 */
export const GlassEmptyState = ({
  icon: Icon = FolderOpen,
  titleEn = 'No records found',
  titleTa = 'பதிவுகள் எதுவும் இல்லை',
  subtitleEn = 'There is currently no data to display here.',
  subtitleTa = 'இங்கு காண்பிக்க தற்போது எந்த தரவும் இல்லை.',
  actionLabelEn,
  actionLabelTa,
  onAction,
}) => {
  const { lang } = useLanguage ? useLanguage() : { lang: 'en' };

  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 border border-white/80 dark:border-white/10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 space-y-3.5">
      <div className="w-14 h-14 rounded-2xl bg-[#E3DBF4]/60 dark:bg-[#4B3C8A]/30 text-[#4B3C8A] dark:text-[#E3DBF4] flex items-center justify-center shadow-inner">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {lang === 'ta' ? titleTa : titleEn}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          {lang === 'ta' ? subtitleTa : subtitleEn}
        </p>
      </div>

      {actionLabelEn && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-sky-primary py-2 px-5 text-xs font-medium rounded-xl shadow-md active:scale-95 transition"
        >
          {lang === 'ta' ? actionLabelTa || actionLabelEn : actionLabelEn}
        </button>
      )}
    </div>
  );
};

export default ToastProvider;

