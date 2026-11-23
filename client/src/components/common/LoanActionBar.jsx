import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  MessageCircle,
  History,
  Pencil,
  Trash2,
  FileDown,
  CalendarClock,
  Printer,
  FileText,
  AlertTriangle,
  X,
  ChevronRight,
} from 'lucide-react';

export const LoanActionBar = ({
  loan,
  onOpenWhatsAppHub,
  onOpenPaymentHistory,
  onOpenEditLoan,
  onDeleteLoan,
  onDownloadFormPDF,
  onDownloadRepaymentSchedulePDF,
  onPrintForm,
  className = '',
}) => {
  const { isOwner } = useAuth();
  const { lang } = useLanguage();

  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDocumentsModal(false);
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConfirmDelete = async () => {
    if (!onDeleteLoan || deleting) return;
    try {
      setDeleting(true);
      await onDeleteLoan();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const documentItems = [
    {
      id: 'formPdf',
      icon: FileDown,
      title: lang === 'ta' ? 'விண்ணப்பம் & ஒப்பந்தம் PDF' : 'Download Agreement Form PDF',
      tamilTitle: 'கடன் விண்ணப்பம் & ஒப்பந்தம் PDF',
      description: lang === 'ta' ? 'புகைப்படத்துடன் கூடிய அதிகாரப்பூர்வ ஒப்பந்த PDF' : 'Official loan application with borrower photo & terms',
      action: () => {
        setShowDocumentsModal(false);
        if (onDownloadFormPDF) onDownloadFormPDF();
      },
      iconColor: 'text-[#0878D1]',
      iconBg: 'bg-[#EAF5FF] border-[#D5E9FA]',
    },
    {
      id: 'schedulePdf',
      icon: CalendarClock,
      title: lang === 'ta' ? 'தவணை அட்டவணை அறிக்கை PDF' : 'Repayment Schedule Statement PDF',
      tamilTitle: 'தவணை அட்டவணை அறிக்கை PDF',
      description: lang === 'ta' ? 'நாள் வாரியான முழு தவணை மற்றும் வசூல் நிலை' : 'Day-by-day collection breakdown statement with dues',
      action: () => {
        setShowDocumentsModal(false);
        if (onDownloadRepaymentSchedulePDF) onDownloadRepaymentSchedulePDF();
      },
      iconColor: 'text-[#1F6FC8]',
      iconBg: 'bg-[#EAF5FF] border-[#D5E9FA]',
    },
    {
      id: 'printForm',
      icon: Printer,
      title: lang === 'ta' ? 'விண்ணப்ப படிவம் அச்சிடு' : 'Print Official Application Form',
      tamilTitle: 'விண்ணப்ப படிவம் அச்சிடு',
      description: lang === 'ta' ? 'கையெழுத்து மற்றும் அலுவலக ஆவண அச்சு' : 'Direct print preview for promissory note and physical filing',
      action: () => {
        setShowDocumentsModal(false);
        if (onPrintForm) onPrintForm();
      },
      iconColor: 'text-[#0878D1]',
      iconBg: 'bg-[#EAF5FF] border-[#D5E9FA]',
    },
  ];

  return (
    <>
      {/* 5-Card Action Grid: 2 cols on mobile, 3 on tablet, 5 on desktop */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${
          isOwner ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        } gap-2.5 sm:gap-3 ${className}`}
      >
        {/* 1. WhatsApp Hub */}
        <button
          type="button"
          onClick={onOpenWhatsAppHub}
          className="bg-white/60 hover:bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(31,111,200,0.08)] hover:shadow-[0_12px_28px_rgba(31,111,200,0.14)] rounded-2xl p-3 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-left flex items-center space-x-3 group"
          title="Send reminders, balance updates, and messages via WhatsApp"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <MessageCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-sm font-bold text-[#183653] leading-tight block truncate group-hover:text-[#0878D1] transition-colors">
              WhatsApp Hub
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#647C95] leading-tight block truncate mt-0.5">
              வாட்ஸ்அப் மையம்
            </span>
          </div>
        </button>

        {/* 2. Payment History */}
        <button
          type="button"
          onClick={onOpenPaymentHistory}
          className="bg-white/60 hover:bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(31,111,200,0.08)] hover:shadow-[0_12px_28px_rgba(31,111,200,0.14)] rounded-2xl p-3 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-left flex items-center space-x-3 group"
          title="View and share complete payment history statement"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#1F6FC8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <History className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-sm font-bold text-[#183653] leading-tight block truncate group-hover:text-[#0878D1] transition-colors">
              Payment History
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#647C95] leading-tight block truncate mt-0.5">
              வசூல் வரலாறு
            </span>
          </div>
        </button>

        {/* 3. Edit Loan */}
        <button
          type="button"
          onClick={onOpenEditLoan}
          className="bg-white/60 hover:bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(31,111,200,0.08)] hover:shadow-[0_12px_28px_rgba(31,111,200,0.14)] rounded-2xl p-3 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-left flex items-center space-x-3 group"
          title="Edit Loan terms, principal, duration & borrower details"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <Pencil className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-sm font-bold text-[#183653] leading-tight block truncate group-hover:text-[#0878D1] transition-colors">
              Edit Loan
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#647C95] leading-tight block truncate mt-0.5">
              கடன் திருத்து
            </span>
          </div>
        </button>

        {/* 4. Documents (combining Download Form PDF, Repayment Schedule PDF, Print Form) */}
        <button
          type="button"
          onClick={() => setShowDocumentsModal(true)}
          className="bg-white/60 hover:bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(31,111,200,0.08)] hover:shadow-[0_12px_28px_rgba(31,111,200,0.14)] rounded-2xl p-3 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-left flex items-center space-x-3 group"
          title="View and download loan agreements, statements, and print forms"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#1F6FC8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[#183653] leading-tight block truncate group-hover:text-[#0878D1] transition-colors">
                Documents
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] hidden sm:inline-block">
                3 PDFs
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#647C95] leading-tight block truncate mt-0.5">
              கடன் ஆவணங்கள்
            </span>
          </div>
        </button>

        {/* 5. Delete Loan (Owner only, with confirmation popup) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-white/60 hover:bg-red-50/70 backdrop-blur-xl border border-white/80 hover:border-red-200 shadow-[0_8px_24px_rgba(31,111,200,0.08)] hover:shadow-[0_12px_28px_rgba(239,68,68,0.14)] rounded-2xl p-3 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-left flex items-center space-x-3 group"
            title="Permanently Delete This Loan Account"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-red-600 leading-tight block truncate">
                Delete Loan
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-red-500/80 leading-tight block truncate mt-0.5">
                கடன் நீக்கு
              </span>
            </div>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* POPUP 1: DOCUMENTS GLASS MODAL */}
      {/* ========================================================================= */}
      {showDocumentsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in"
          onClick={() => setShowDocumentsModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-[#D5E9FA] shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D5E9FA]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#183653] leading-tight">
                    Documents & Forms
                  </h3>
                  <p className="text-[11px] text-[#647C95] leading-tight mt-0.5">
                    கடன் ஆவணங்கள் மற்றும் படிவங்கள்
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Options List */}
            <div className="space-y-2.5 pt-1">
              {documentItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className="w-full bg-[#F3F9FF]/80 hover:bg-[#EAF5FF] border border-[#D5E9FA] hover:border-[#55B8F5] rounded-2xl p-3.5 transition-all text-left flex items-center justify-between space-x-3 group active:scale-[0.98] shadow-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor} group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm text-[#183653] group-hover:text-[#0878D1] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#647C95] truncate mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#647C95] group-hover:text-[#0878D1] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Modal Footer Note */}
            <div className="pt-2 text-center text-[10px] text-[#647C95]">
              {lang === 'ta'
                ? 'அனைத்து அறிக்கைகளும் இந்திய ரூபாய் (₹) முறைப்படி உருவாக்கப்படும்'
                : 'All PDF statements are generated instantly with official Indian rupee formatting'}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 2: DELETE LOAN CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-red-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Chip */}
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
            </div>

            {/* Bilingual Title */}
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#183653] leading-tight">
                Permanently Delete Loan?
              </h3>
              <p className="text-xs font-bold text-red-600 mt-0.5">
                கடன் கணக்கை நிரந்தரமாக நீக்கவா?
              </p>
            </div>

            {/* Bilingual Message Body */}
            <div className="bg-red-50/60 rounded-2xl p-3.5 border border-red-200/60 text-xs text-slate-700 text-left space-y-1.5">
              <p className="leading-relaxed">
                Are you sure you want to permanently delete Loan{' '}
                <strong className="text-red-700 font-mono">{loan?.loanNo || ''}</strong>?
                All associated repayment schedule records and transaction logs will be permanently removed.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-red-100">
                இந்த கடன் கணக்கை ({loan?.loanNo || ''}) நிரந்தரமாக நீக்க விரும்புகிறீர்களா? இதனுடன் தொடர்புடைய அனைத்து தவணை மற்றும் வசூல் பதிவுகளும் நீக்கப்படும்.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-[#D5E9FA] hover:bg-[#F3F9FF] text-xs font-bold text-[#647C95] transition active:scale-95 disabled:opacity-50"
              >
                Cancel / ரத்து
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-md shadow-red-500/25 transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Deleting...' : 'Delete Loan / நீக்கு'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoanActionBar;

