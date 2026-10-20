import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/currency';
import {
  Wallet,
  TrendingDown,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Trash2,
  Coffee,
  Fuel,
  Building,
  Users,
  FileText,
  Zap,
  Wrench,
  HelpCircle,
  CreditCard,
  Banknote,
  CheckCircle2,
  X,
  Printer,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const Expenses = ({ onNavigateToDashboard }) => {
  const { lang, t } = useLanguage();
  const { isMobile, isTablet } = useDeviceMode();
  const { isOwner } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Add Expense Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('tea_refreshment');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(formatDateForInput());
  const [formMode, setFormMode] = useState('cash');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formReceiptNo, setFormReceiptNo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const categoryConfig = {
    tea_refreshment: {
      label: lang === 'ta' ? 'தேநீர் & சிற்றுண்டி' : 'Tea & Refreshments',
      icon: Coffee,
      color: 'amber',
      bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    },
    travel_fuel: {
      label: lang === 'ta' ? 'பெட்ரோல் & பயணச்செலவு' : 'Fuel & Travel',
      icon: Fuel,
      color: 'sky',
      bg: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300',
    },
    rent: {
      label: lang === 'ta' ? 'அலுவலக வாடகை' : 'Office Rent',
      icon: Building,
      color: 'indigo',
      bg: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
    },
    salary: {
      label: lang === 'ta' ? 'ஊழியர் சம்பளம்' : 'Staff Salary',
      icon: Users,
      color: 'purple',
      bg: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
    },
    stationery: {
      label: lang === 'ta' ? 'நோட்டு & அச்சு செலவு' : 'Stationery & Printing',
      icon: FileText,
      color: 'emerald',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    },
    electricity_internet: {
      label: lang === 'ta' ? 'மின்சாரம் & போன்' : 'Electricity & Internet',
      icon: Zap,
      color: 'yellow',
      bg: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300',
    },
    maintenance: {
      label: lang === 'ta' ? 'பராமரிப்பு செலவு' : 'Maintenance',
      icon: Wrench,
      color: 'orange',
      bg: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
    },
    miscellaneous: {
      label: lang === 'ta' ? 'இதர செலவுகள்' : 'Miscellaneous',
      icon: HelpCircle,
      color: 'slate',
      bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300',
    },
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, statsRes] = await Promise.all([
        api.getExpenses(),
        api.getDashboardStats(),
      ]);
      if (expRes.success) setExpenses(expRes.expenses || []);
      if (statsRes.success) setDashboardStats(statsRes);
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter an expense title/description');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        amount: Number(formAmount),
        date: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        mode: formMode,
        paidTo: formPaidTo.trim(),
        receiptNo: formReceiptNo.trim(),
        notes: formNotes.trim(),
      };

      const res = await api.createExpense(payload);
      if (res.success) {
        setShowAddModal(false);
        resetForm();
        loadData();
      } else {
        setFormError(res.message || 'Failed to record expense');
      }
    } catch (err) {
      setFormError(err.message || 'Error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await api.deleteExpense(id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert('Failed to delete expense: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('tea_refreshment');
    setFormAmount('');
    setFormDate(formatDateForInput());
    setFormMode('cash');
    setFormPaidTo('');
    setFormReceiptNo('');
    setFormNotes('');
    setFormError('');
  };

  // Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const totalOverallExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const todayExpenses = expenses
    .filter((e) => (e.date || '').slice(0, 10) === todayStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonthExpenses = expenses
    .filter((e) => (e.date || '').slice(0, 7) === currentMonthStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalGrossCollected = dashboardStats?.cards?.totalCollected || 0;
  const netCollectedInHand = Math.max(0, totalGrossCollected - totalOverallExpenses);

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (selectedDate && (e.date || '').slice(0, 10) !== selectedDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (e.title || '').toLowerCase().includes(q);
      const matchPaidTo = (e.paidTo || '').toLowerCase().includes(q);
      const matchNotes = (e.notes || '').toLowerCase().includes(q);
      const matchReceipt = (e.receiptNo || '').toLowerCase().includes(q);
      if (!matchTitle && !matchPaidTo && !matchNotes && !matchReceipt) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-rose-500" />
            <span>{lang === 'ta' ? 'அலுவலக & இதர செலவுகள்' : 'Expenses & Cash Outflow'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'ta'
              ? 'செலவுகள் சேர்க்கும்போது, வசூலான தொகையிலிருந்து தானாகக் கழியும்'
              : 'Recorded expenses automatically deduct from overall collections'}
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/25 flex items-center justify-center space-x-2 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'ta' ? 'புதிய செலவு பதிவு' : 'Add New Expense'}</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Overall Expenses */}
        <div className="glass rounded-3xl p-5 border border-rose-200/80 dark:border-rose-900/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              {lang === 'ta' ? 'மொத்த செலவுகள்' : 'Total Expenses'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 tabular-nums whitespace-nowrap">
            {formatCurrency(totalOverallExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {expenses.length} {lang === 'ta' ? 'செலவு பதிவுகள்' : 'expenses recorded overall'}
          </p>
        </div>

        {/* Card 2: Today's Expenses */}
        <div className="glass rounded-3xl p-5 border border-amber-200/80 dark:border-amber-900/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              {lang === 'ta' ? 'இன்றைய செலவு' : "Today's Expenses"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tabular-nums whitespace-nowrap">
            {formatCurrency(todayExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {expenses.filter((e) => (e.date || '').slice(0, 10) === todayStr).length} {lang === 'ta' ? 'இன்று செலவானது' : 'spent today'}
          </p>
        </div>

        {/* Card 3: This Month's Expenses */}
        <div className="glass rounded-3xl p-5 border border-sky-200/80 dark:border-sky-900/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
              {lang === 'ta' ? 'நடப்பு மாத செலவு' : "This Month's Expenses"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tabular-nums whitespace-nowrap">
            {formatCurrency(thisMonthExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Current calendar month
          </p>
        </div>

        {/* Card 4: Net Remaining in Hand */}
        <div className="glass rounded-3xl p-5 border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              {lang === 'ta' ? 'செலவு போக மீதி வசூல்' : 'Net Collections in Hand'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tabular-nums whitespace-nowrap">
            {formatCurrency(netCollectedInHand)}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 font-bold mt-1">
            Gross {formatCurrency(totalGrossCollected)} - Exp {formatCurrency(totalOverallExpenses)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass rounded-3xl p-4 border border-white/80 dark:border-sky-800/40 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search expenses, recipient, voucher #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-11 px-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-500 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md'
                : 'glass text-slate-600 dark:text-slate-400 hover:text-sky-600'
            }`}
          >
            {lang === 'ta' ? 'அனைத்து செலவுகள்' : 'All Expenses'}
          </button>

          {Object.entries(categoryConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === key
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'glass text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-rose-500" />
              <span>{lang === 'ta' ? 'செலவு பதிவுகள் பட்டியல்' : 'Recorded Outflow Vouchers'}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Showing {filteredExpenses.length} expense records
            </p>
          </div>

          <span className="text-xs font-black text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-xl border border-rose-200 tabular-nums whitespace-nowrap">
            Subtotal: {formatCurrency(filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0))}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 glass rounded-2xl space-y-2">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-200">No matching expenses found</p>
            <p className="text-[11px]">Click '+ Add New Expense' to log tea, petrol, rent, or maintenance.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((expense) => {
              const cat = categoryConfig[expense.category] || categoryConfig.miscellaneous;
              const Icon = cat.icon;

              return (
                <div
                  key={expense._id}
                  className="p-4 rounded-2xl glass glass-hover border border-rose-100 dark:border-rose-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
                >
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl glass border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {expense.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.bg}`}>
                          {cat.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            expense.mode === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {expense.mode?.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-2">
                        <span className="text-sky-600 font-bold">{formatDate(expense.date)}</span>
                        {expense.paidTo && <span>• Paid to: {expense.paidTo}</span>}
                        {expense.receiptNo && <span>• Voucher: {expense.receiptNo}</span>}
                      </div>

                      {expense.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          "{expense.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0">
                    <p className="font-black tabular-nums text-base sm:text-lg text-rose-600 whitespace-nowrap">
                      -{formatCurrency(expense.amount)}
                    </p>

                    {isOwner && (
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setShowAddModal(false)} aria-hidden="true" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-panel rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-sky-800/60 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {lang === 'ta' ? 'புதிய செலவு பதிவு' : 'Add New Expense'}
                  </h3>
                  <p className="text-xs text-slate-500">Record cash / UPI outflow voucher</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl glass hover:bg-sky-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ta' ? 'செலவு தலைப்பு / விவரம் *' : 'Expense Title / Description *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field agent morning tea, Bike petrol..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'செலவு தொகை (₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 250"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'செலவு வகை' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold focus:outline-none"
                  >
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'தேதி' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'பணம் செலுத்திய முறை' : 'Payment Mode'}
                  </label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold focus:outline-none"
                  >
                    <option value="cash">Cash (ரொக்கம்)</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'பெற்ற நபர் / கடை' : 'Paid To (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Murugan Tea Stall"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ta' ? 'பில் / வவுச்சர் எண்' : 'Bill / Receipt #'}
                  </label>
                  <input
                    type="text"
                    placeholder="Auto or manual"
                    value={formReceiptNo}
                    onChange={(e) => setFormReceiptNo(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ta' ? 'குறிப்புகள் / குறிப்பு' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 h-11 rounded-xl glass font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black text-xs shadow-md shadow-rose-500/25 active:scale-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
