import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatShortCurrency, formatDate } from '../utils/currency';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CreditCard,
  Send,
  Clock,
} from 'lucide-react';

export const Calendar = () => {
  const { t, lang } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loans, setLoans] = useState([]);
  const [selectedDayItems, setSelectedDayItems] = useState([]);
  const [selectedDayDate, setSelectedDayDate] = useState(new Date());

  const [payItem, setPayItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);

  const fetchLoans = async () => {
    try {
      const res = await api.getLoans({ status: 'all' });
      if (res.success) {
        setLoans(res.loans);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month & total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map scheduled installments to day numbers
  const daysMap = {};
  loans.forEach((loan) => {
    loan.schedule?.forEach((inst) => {
      const d = new Date(inst.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        if (!daysMap[dayNum]) {
          daysMap[dayNum] = { count: 0, totalDue: 0, items: [] };
        }
        daysMap[dayNum].count += 1;
        daysMap[dayNum].totalDue += inst.amount;
        daysMap[dayNum].items.push({
          loanId: loan._id,
          loanNo: loan.loanNo,
          financeType: loan.financeType,
          customerId: loan.customerId?._id,
          customerName: loan.customerId?.name,
          customerPhone: loan.customerId?.phone,
          customerArea: loan.customerId?.area,
          installmentNo: inst.installmentNo,
          amount: inst.amount,
          paidAmount: inst.paidAmount,
          dueAmount: inst.amount - (inst.paidAmount || 0),
          dueDate: inst.dueDate,
          status: inst.status,
        });
      }
    });
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDayClick = (dayNum) => {
    const d = new Date(year, month, dayNum);
    setSelectedDayDate(d);
    setSelectedDayItems(daysMap[dayNum]?.items || []);
  };

  return (
    <div className="space-y-6">
      {/* Header with Month Navigators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('calendar')} / தவணை நாட்காட்டி
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monthly schedule of collections due per day
          </p>
        </div>

        <div className="flex items-center space-x-2 glass px-3 h-11 rounded-xl border border-sky-200/80 dark:border-sky-800/60 shadow-sm self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sky-100/50 dark:hover:bg-sky-950/50 transition active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white min-w-[130px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sky-100/50 dark:hover:bg-sky-950/50 transition active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Calendar Grid & Selected Day Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar Grid (2 Cols on desktop) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty slots for month start */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[70px] rounded-2xl bg-transparent" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayData = daysMap[dayNum];
              const isSelected = selectedDayDate.getDate() === dayNum && selectedDayDate.getMonth() === month;
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <button
                  key={dayNum}
                  onClick={() => handleDayClick(dayNum)}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 shadow-md ring-2 ring-sky-400/40'
                      : 'border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 hover:border-sky-300'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span
                      className={`text-xs font-black ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayData && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                        {dayData.count}
                      </span>
                    )}
                  </div>

                  {dayData ? (
                    <div className="mt-1">
                      <p className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 truncate">
                        {formatShortCurrency(dayData.totalDue)}
                      </p>
                      <p className="text-[9px] text-slate-400 hidden sm:block">due</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">-</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Dues Drawer */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Dues on {formatDate(selectedDayDate)}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedDayItems.length} installments scheduled
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 tabular-nums">
              {formatCurrency(selectedDayItems.reduce((acc, i) => acc + i.amount, 0))}
            </span>
          </div>

          {selectedDayItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No collections scheduled on this day. Tap another date to view dues.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDayItems.map((item, idx) => (
                <div
                  key={`${item.loanId}-${item.installmentNo}-${idx}`}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.loanNo} • {item.customerArea}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div>
                      <p className="text-[10px] text-slate-400">Installment #{item.installmentNo}</p>
                      <p className="font-black text-sm text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setWhatsappItem(item)}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition active:scale-95"
                        title="WhatsApp Reminder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {item.status !== 'paid' && (
                        <button
                          onClick={() => setPayItem(item)}
                          className="btn-sky-primary px-3 py-1.5 text-xs font-black shadow-sm"
                        >
                          Collect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {payItem && (
        <PaymentModal
          loanItem={payItem}
          onClose={() => setPayItem(null)}
          onSuccess={(recordedPayment) => {
            fetchLoans();
            setReceiptPayment(recordedPayment);
          }}
        />
      )}

      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}
    </div>
  );
};

export default Calendar;
