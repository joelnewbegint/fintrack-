import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  CreditCard,
  RefreshCw,
  Smartphone,
  CheckCheck,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export const NotificationModal = ({
  isOpen,
  onClose,
  onRecordPayment,
  onOpenWhatsApp,
  onViewLoan,
}) => {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'overdue', 'today', 'system'
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({
    overdueList: [],
    todayDueList: [],
    recentPayments: [],
    todaySummary: null,
    whatsAppStatus: null,
  });
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fintrack_dismissed_notifs') || '[]');
    } catch {
      return [];
    }
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [statsRes, waRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getWhatsAppStatus().catch(() => null),
      ]);

      const overdue = statsRes?.overdueLoans || [];
      const todayDue = (statsRes?.todayDueList || []).filter((item) => !item.isPaidToday);
      const recent = statsRes?.completedTodayList || [];
      const summary = statsRes?.todayStats || null;

      setNotifications({
        overdueList: overdue,
        todayDueList: todayDue,
        recentPayments: recent,
        todaySummary: summary,
        whatsAppStatus: waRes?.status || (waRes?.connected ? 'connected' : 'disconnected'),
      });
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dismissNotification = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('fintrack_dismissed_notifs', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllDismissed = () => {
    setDismissedIds([]);
    localStorage.removeItem('fintrack_dismissed_notifs');
  };

  // Filtered lists excluding dismissed items
  const activeOverdue = notifications.overdueList.filter(
    (item) => !dismissedIds.includes(`overdue-${item._id || item.loanNo}`)
  );
  const activeToday = notifications.todayDueList.filter(
    (item) => !dismissedIds.includes(`due-${item.loanId || item.loanNo}-${item.installmentNo}`)
  );

  const totalCount = activeOverdue.length + activeToday.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative glass-panel rounded-3xl border border-white/80 dark:border-sky-800/60 shadow-2xl max-w-xl w-full mx-auto max-h-[88vh] flex flex-col overflow-hidden z-10 animate-scale-up">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-sky-100/80 dark:border-sky-900/60 flex items-center justify-between gap-3 bg-gradient-to-r from-sky-500/10 via-transparent to-sky-500/5">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 border border-white/60">
              <Bell className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {totalCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  {lang === 'ta' ? 'அறிவிப்புகள்' : 'Notifications & Alerts'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/80 text-sky-700 dark:text-sky-300 font-extrabold text-[10px]">
                  {totalCount} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ta'
                  ? 'தவணை தவறிய கடன்கள், இன்றைய வசூல்கள் மற்றும் வாட்ஸ்அப் நினைவூட்டல்'
                  : 'Overdue loans, scheduled collections today, and action shortcuts'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 rounded-xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-600 dark:text-slate-300 transition active:scale-95"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl glass hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-400 transition active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Filter Bar */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-sky-100/60 dark:border-sky-900/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25'
                : 'glass text-slate-600 dark:text-slate-400 hover:text-sky-600'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25'
                : 'glass text-slate-600 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Overdue ({activeOverdue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25'
                : 'glass text-slate-600 dark:text-slate-400 hover:text-amber-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Today's Dues ({activeToday.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                : 'glass text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Service Status</span>
          </button>
        </div>

        {/* Notifications Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
              <span>Checking live dues and customer alerts...</span>
            </div>
          ) : totalCount === 0 && activeTab !== 'system' ? (
            <div className="py-12 text-center text-xs text-slate-400 glass rounded-2xl p-6 space-y-2">
              <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {lang === 'ta' ? 'அனைத்து தவணைகளும் சரியாக உள்ளன!' : 'You are all caught up!'}
              </p>
              <p className="text-[11px] text-slate-500">
                {lang === 'ta'
                  ? 'தற்போது தவணை தவறிய கடன்கள் ஏதுமில்லை. புதிய தவணை எச்சரிக்கைகள் இங்கு தோன்றும்.'
                  : 'No overdue loans or uncollected dues pending right now.'}
              </p>
              {dismissedIds.length > 0 && (
                <button
                  onClick={clearAllDismissed}
                  className="mt-3 text-[11px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                >
                  Reset dismissed alerts ({dismissedIds.length})
                </button>
              )}
            </div>
          ) : (
            <>
              {/* SECTION 1: Overdue Loan Alerts */}
              {(activeTab === 'all' || activeTab === 'overdue') &&
                activeOverdue.map((loan) => {
                  const custName = loan.customerId?.name || loan.customerName || 'Customer';
                  const parsedName = parseCustomerName(custName);
                  const phone = loan.customerId?.phone || loan.customerPhone || '';
                  const dueAmt = loan.installmentAmount || loan.remainingBalance || 0;
                  const daysLate = loan.overdueDays || 3;
                  const notifId = `overdue-${loan._id || loan.loanNo}`;

                  return (
                    <div
                      key={notifId}
                      className="p-3.5 sm:p-4 rounded-2xl glass border border-rose-200/80 dark:border-rose-950/60 border-l-4 border-l-rose-500 space-y-3 shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {parsedName.primary}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Overdue ({daysLate}d)
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {loan.financeType || 'Daily'}
                              </span>
                            </div>
                            {parsedName.secondary && (
                              <p className="text-[11px] text-slate-400 truncate">{parsedName.secondary}</p>
                            )}
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {loan.loanNo} • {loan.customerId?.area || loan.area || 'Coimbatore'}
                              {phone && ` • 📱 ${phone}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-sm sm:text-base text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap block">
                            {formatCurrency(dueAmt)}
                          </span>
                          <span className="text-[10px] text-slate-400">Past Due</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-rose-100/60 dark:border-rose-950/40 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => dismissNotification(notifId)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          Dismiss
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onClose();
                              if (onOpenWhatsApp) {
                                onOpenWhatsApp({
                                  customerName: custName,
                                  customerPhone: phone,
                                  dueAmount: dueAmt,
                                  loanNo: loan.loanNo,
                                  dueDate: new Date(),
                                });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1"
                            title="Send WhatsApp Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => {
                              onClose();
                              if (onRecordPayment) {
                                onRecordPayment({
                                  loanId: loan._id,
                                  loanNo: loan.loanNo,
                                  customerName: custName,
                                  dueAmount: dueAmt,
                                  installmentAmount: dueAmt,
                                });
                              }
                            }}
                            className="btn-sky-primary px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center space-x-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>

                          {onViewLoan && (
                            <button
                              onClick={() => {
                                onClose();
                                onViewLoan(loan._id);
                              }}
                              className="px-2 py-1.5 rounded-xl glass hover:bg-sky-50 text-sky-600 text-xs font-bold transition"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* SECTION 2: Today's Scheduled Collections */}
              {(activeTab === 'all' || activeTab === 'today') &&
                activeToday.map((item) => {
                  const custName = item.customerName || 'Customer';
                  const parsedName = parseCustomerName(custName);
                  const notifId = `due-${item.loanId || item.loanNo}-${item.installmentNo}`;

                  return (
                    <div
                      key={notifId}
                      className="p-3.5 sm:p-4 rounded-2xl glass border border-amber-200/80 dark:border-amber-950/60 border-l-4 border-l-amber-500 space-y-3 shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {parsedName.primary}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Due Today
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {item.financeType || 'Daily'}
                              </span>
                            </div>
                            {parsedName.secondary && (
                              <p className="text-[11px] text-slate-400 truncate">{parsedName.secondary}</p>
                            )}
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {item.loanNo} • Inst #{item.installmentNo}
                              {item.customerArea && ` • ${item.customerArea}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap block">
                            {formatCurrency(item.dueAmount || item.installmentAmount || 0)}
                          </span>
                          <span className="text-[10px] text-slate-400">Scheduled</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-amber-100/60 dark:border-amber-950/40 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => dismissNotification(notifId)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          Dismiss
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onClose();
                              if (onOpenWhatsApp) {
                                onOpenWhatsApp({
                                  customerName: custName,
                                  customerPhone: item.customerPhone || item.phone,
                                  dueAmount: item.dueAmount || item.installmentAmount,
                                  loanNo: item.loanNo,
                                  dueDate: new Date(),
                                });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => {
                              onClose();
                              if (onRecordPayment) {
                                onRecordPayment(item);
                              }
                            }}
                            className="btn-sky-primary px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center space-x-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* SECTION 3: WhatsApp Bot & System Status */}
              {(activeTab === 'all' || activeTab === 'system') && (
                <div className="p-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                          WhatsApp Reminder Bot
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {notifications.whatsAppStatus === 'connected'
                            ? 'Bot is actively connected and ready to send customer reminders.'
                            : 'Bot is offline. Connect WhatsApp in Settings -> WhatsApp Connect.'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        notifications.whatsAppStatus === 'connected'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {notifications.whatsAppStatus === 'connected' ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-sky-100/60 dark:border-sky-900/40 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            VK BANKER'S & FINANCE • Automated Alert Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl glass font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:scale-95 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
