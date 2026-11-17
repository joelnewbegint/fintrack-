import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Reusable GlassModal Component
 * - Centered dialog over dimmed blurred backdrop (180ms scale & fade-in)
 * - Closes on Esc or backdrop click
 * - Focus-trapped for accessibility
 * - Converts to responsive bottom sheet on mobile devices
 * - Scoped styling for Lavender Glass & existing glass themes
 */
export const GlassModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
  footer,
  customHeader,
}) => {
  const { lang } = useLanguage ? useLanguage() : { lang: 'en' };
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  // Focus trap and keyboard Esc listener
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on first interactive element or modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstInput = modalRef.current.querySelector('input, select, textarea, button:not([aria-label="Close"])');
        if (firstInput) {
          firstInput.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    // Prevent body background scroll while open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocusedElement.current && previouslyFocusedElement.current.focus) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-180 ease-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glass-modal-title"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-180 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog (Bottom-Sheet on mobile, Centered Card on sm+) */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxWidth} bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-2xl rounded-t-3xl sm:rounded-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col transform transition-all duration-180 ease-out animate-in fade-in zoom-in-95 outline-none overflow-hidden`}
        style={{
          boxShadow: '0 20px 48px rgba(139, 123, 208, 0.20)',
        }}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        {customHeader ? (
          customHeader
        ) : (
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 pr-2">
              <h3
                id="glass-modal-title"
                className="text-base sm:text-lg font-medium text-slate-900 dark:text-white tracking-tight truncate flex items-center space-x-2"
              >
                <span>{title}</span>
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'ta' ? 'மூடுக' : 'Close modal'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition active:scale-95 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1 text-xs text-slate-700 dark:text-slate-300 space-y-4">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassModal;

