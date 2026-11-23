import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Reusable Golden Cream GlassModal Component
 * - Centered dialog on desktop (max blur 12px)
 * - Responsive bottom sheet on mobile (<640px)
 * - Esc key, backdrop tap, and focus trapping
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

    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstInput = modalRef.current.querySelector(
          'input, select, textarea, button:not([aria-label="Close"])'
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="golden-modal-title"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-[#2B3A4A]/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container: Bottom Sheet on Mobile (<640px), Centered Card on sm+ */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxWidth} bg-white/90 backdrop-blur-md border border-white/95 rounded-t-[28px] sm:rounded-[24px] max-h-[90vh] sm:max-h-[85vh] flex flex-col transform transition-all duration-200 ease-out outline-none overflow-hidden`}
        style={{
          boxShadow: '0 20px 48px rgba(43, 58, 74, 0.16)',
        }}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-[#FFE7A8] rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        {customHeader ? (
          customHeader
        ) : (
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#FFE7A8]/70 flex items-start justify-between gap-3 shrink-0 bg-white/40">
            <div className="min-w-0 pr-2">
              <h3
                id="golden-modal-title"
                className="text-base sm:text-lg font-black text-ink tracking-tight truncate flex items-center space-x-2"
              >
                <span>{title}</span>
              </h3>
              {subtitle && (
                <p className="text-xs text-muted mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'ta' ? 'மூடுக' : 'Close modal'}
                className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-[#FFE7A8]/60 transition active:scale-95 shrink-0"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1 text-xs text-ink space-y-4">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-[#FFE7A8]/70 bg-white/60 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassModal;
