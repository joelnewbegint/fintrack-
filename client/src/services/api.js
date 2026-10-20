import {
  initialCustomers,
  initialLoans,
  initialPayments,
  initialSettings,
  initialInvestments,
  initialExpenses,
} from './mockData';

// Local Storage helpers for offline / static mode (Firebase Hosting, Vercel, etc.)
const STORAGE_KEYS = {
  CUSTOMERS: 'fintrack_local_customers',
  LOANS: 'fintrack_local_loans',
  PAYMENTS: 'fintrack_local_payments',
  SETTINGS: 'fintrack_local_settings',
  INVESTMENTS: 'fintrack_local_investments',
  EXPENSES: 'fintrack_local_expenses',
};

const getStored = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(data);
  } catch {
    return fallback;
  }
};

const setStored = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
};

const getHeaders = () => {
  const token = localStorage.getItem('fintrack_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Check if response is valid JSON; returns { ok: true, data } or { ok: false, error }
const safeFetchJson = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (contentType.includes('application/json') || (text.trim().startsWith('{') && !text.includes('<!DOCTYPE'))) {
      const json = JSON.parse(text);
      if (res.ok && json.success !== false) {
        return { ok: true, data: json };
      }
      return { ok: false, error: json.message || `Request failed with status ${res.status}` };
    }
    // Server returned HTML (e.g. <!DOCTYPE html> on Firebase static hosting or 404/502)
    return { ok: false, isHtml: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const api = {
  // Dashboard
  getDashboardStats: async () => {
    const result = await safeFetchJson('/api/dashboard/stats', { headers: getHeaders() });
    if (result.ok) return result.data;

    // Fallback: Calculate from local store
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);

    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
    const completedLoans = loans.filter((l) => l.status === 'completed' || l.status === 'closed');
    const totalActiveCapital = activeLoans.reduce((sum, l) => sum + (l.principalAmount || l.principal || 0), 0);
    const totalBalance = activeLoans.reduce((sum, l) => sum + (l.balanceAmount || l.remainingBalance || 0), 0);

    // Active interest = (totalRepayable - principal) of all active loans.
    // When a loan settles/completes, it leaves active loans, which automatically decreases activeInterest
    // and transfers into profitFromSettled!
    const activeInterest = activeLoans.reduce((sum, l) => {
      const rep = Number(l.totalRepayable || l.totalPayable || (l.principalAmount || l.principal || 0));
      const pr = Number(l.principalAmount || l.principal || 0);
      return sum + Math.max(0, rep - pr);
    }, 0);

    // Total Settled Amount = sum of total repayments/settled amount across all completed loans
    const settledAmount = completedLoans.reduce((sum, l) => {
      const paid = Number(l.totalPaid || l.totalCollected || l.totalRepayable || l.totalPayable || 0);
      return sum + paid;
    }, 0);

    // Profit from Settled = realized profit from completed loans (totalPaid - principal)
    const profitFromSettled = completedLoans.reduce((sum, l) => {
      const paid = Number(l.totalPaid || l.totalCollected || l.totalRepayable || l.totalPayable || 0);
      const pr = Number(l.principalAmount || l.principal || 0);
      return sum + Math.max(0, paid - pr);
    }, 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = payments.filter((p) => (p.paymentDate || '').startsWith(todayStr));
    const collectedToday = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const expectedToday = activeLoans.reduce((sum, l) => sum + (l.installmentAmount || 0), 0);
    const overdueLoans = activeLoans.filter((l) => (l.overdueDays || 0) > 0);
    const overdueAmount = overdueLoans.reduce((sum, l) => sum + (l.installmentAmount || 0) * (l.overdueDays || 1), 0);

    const todayDueFormatted = activeLoans.map((l) => ({
      loanId: l._id,
      loanNo: l.loanNo,
      customerName: l.customerName,
      customerPhone: l.customerPhone,
      customerArea: l.area,
      installmentAmount: l.installmentAmount,
      dueAmount: l.installmentAmount,
      financeType: l.financeType || 'daily',
      status: l.status,
      isPaidToday: todayPayments.some((p) => p.loanId === l._id),
      dueDate: new Date().toISOString(),
    }));

    const expenses = getStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayExpenses = expenses
      .filter((e) => (e.date || '').startsWith(todayStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalGrossCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netCollected = Math.max(0, totalGrossCollected - totalExpenses);

    // Build Daily Collections Breakdown (joining payments & daily expenses)
    const dailyMap = {};
    payments.forEach((p) => {
      const d = (p.paymentDate || p.date || todayStr).slice(0, 10);
      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          totalCollected: 0,
          receiptsCount: 0,
          cashAmount: 0,
          upiAmount: 0,
          dailyScheme: 0,
          weeklyScheme: 0,
          monthlyScheme: 0,
          expenses: 0,
          netCollected: 0,
        };
      }
      const amt = Number(p.amount) || 0;
      dailyMap[d].totalCollected += amt;
      dailyMap[d].receiptsCount += 1;
      const mode = (p.paymentMode || p.mode || 'cash').toLowerCase();
      if (mode === 'cash') dailyMap[d].cashAmount += amt;
      else dailyMap[d].upiAmount += amt;

      const targetLoan = loans.find((l) => l._id === (p.loanId?._id || p.loanId));
      const scheme = (targetLoan?.financeType || 'daily').toLowerCase();
      if (scheme === 'daily') dailyMap[d].dailyScheme += amt;
      else if (scheme === 'weekly') dailyMap[d].weeklyScheme += amt;
      else if (scheme === 'monthly') dailyMap[d].monthlyScheme += amt;
    });

    expenses.forEach((e) => {
      const d = (e.date || todayStr).slice(0, 10);
      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          totalCollected: 0,
          receiptsCount: 0,
          cashAmount: 0,
          upiAmount: 0,
          dailyScheme: 0,
          weeklyScheme: 0,
          monthlyScheme: 0,
          expenses: 0,
          netCollected: 0,
        };
      }
      dailyMap[d].expenses += Number(e.amount) || 0;
    });

    const dailyCollectionBreakdown = Object.values(dailyMap)
      .map((row) => ({
        ...row,
        netCollected: Math.max(0, row.totalCollected - row.expenses),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      cards: {
        totalLent: totalActiveCapital,
        totalCollected: totalGrossCollected,
        totalExpenses,
        netCollected,
        todayExpenses,
        totalOutstanding: totalBalance,
        activeInterest,
        settledAmount,
        profitFromSettled,
        profitEarned: profitFromSettled,
        totalLoans: loans.length,
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
        completedLoans: completedLoans.length,
      },
      todayDueList: todayDueFormatted,
      overdueLoans: overdueLoans.map((l) => ({
        _id: l._id,
        loanNo: l.loanNo,
        customerId: {
          name: l.customerName,
          phone: l.customerPhone,
          area: l.area,
        },
        remainingBalance: l.balanceAmount,
        installmentAmount: l.installmentAmount,
        overdueDays: l.overdueDays || 3,
        financeType: l.financeType || 'daily',
        status: 'overdue',
      })),
      completedTodayList: todayPayments,
      completedLoansList: completedLoans.map((l) => ({
        _id: l._id,
        loanNo: l.loanNo,
        customerName: l.customerName,
        customerPhone: l.customerPhone,
        area: l.area,
        customerId: {
          name: l.customerName,
          phone: l.customerPhone,
          area: l.area,
        },
        principal: l.principalAmount || l.principal || 0,
        totalPayable: l.totalRepayable || l.totalPayable || 0,
        totalCollected: l.totalPaid || l.totalCollected || l.totalRepayable || 0,
        remainingBalance: 0,
        financeType: l.financeType || 'daily',
        status: 'completed',
        profit: Math.max(0, (l.totalPaid || l.totalRepayable || 0) - (l.principalAmount || l.principal || 0)),
        settledDate: l.settledDate || l.endDate || new Date().toISOString(),
      })),
      dailyCollectionBreakdown,
      todayStats: {
        collectedToday,
        dueCount: activeLoans.length,
        todayPaymentsCount: todayPayments.length,
      },
      stats: {
        activeLoansCount: activeLoans.length,
        totalActiveCapital,
        totalOutstanding: totalBalance,
        collectedToday,
        expectedToday,
        collectionEfficiency: expectedToday > 0 ? Math.min(100, Math.round((collectedToday / expectedToday) * 100)) : 100,
        overdueCount: overdueLoans.length,
        overdueAmount,
        totalCustomers: customers.length,
        recentCollections: payments.slice(0, 5),
        todayDueList: todayDueFormatted,
      },
    };
  },

  // Customers
  getCustomers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await safeFetchJson(`/api/customers?${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    let customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    if (params.search) {
      const q = params.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.area && c.area.toLowerCase().includes(q))
      );
    }
    return { success: true, count: customers.length, customers };
  },

  getCustomerById: async (id) => {
    const result = await safeFetchJson(`/api/customers/${id}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const customer = customers.find((c) => c._id === id);
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans).filter((l) => l.customerId === id);
    return { success: true, customer, loans };
  },

  createCustomer: async (customerData) => {
    const result = await safeFetchJson('/api/customers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    if (result.ok) return result.data;

    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const newCustomer = {
      ...customerData,
      _id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    setStored(STORAGE_KEYS.CUSTOMERS, customers);
    return { success: true, customer: newCustomer };
  },

  updateCustomer: async (id, customerData) => {
    const result = await safeFetchJson(`/api/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    if (result.ok) return result.data;

    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const index = customers.findIndex((c) => c._id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...customerData };
      setStored(STORAGE_KEYS.CUSTOMERS, customers);
      return { success: true, customer: customers[index] };
    }
    return { success: true, customer: customerData };
  },

  deleteCustomer: async (id) => {
    const result = await safeFetchJson(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;

    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const filtered = customers.filter((c) => c._id !== id);
    setStored(STORAGE_KEYS.CUSTOMERS, filtered);
    return { success: true };
  },

  // Loans
  getLoans: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await safeFetchJson(`/api/loans?${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    let loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    if (params.status && params.status !== 'all') {
      loans = loans.filter((l) => l.status === params.status);
    }
    if (params.financeType && params.financeType !== 'all') {
      loans = loans.filter((l) => l.financeType === params.financeType);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      loans = loans.filter(
        (l) =>
          l.loanNo.toLowerCase().includes(q) ||
          l.customerName.toLowerCase().includes(q) ||
          l.customerPhone.includes(q)
      );
    }
    return { success: true, count: loans.length, loans };
  },

  getLoanById: async (id) => {
    const result = await safeFetchJson(`/api/loans/${id}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const loan = loans.find((l) => l._id === id);
    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments).filter((p) => p.loanId === id);
    return { success: true, loan, payments };
  },

  createLoan: async (loanData) => {
    const result = await safeFetchJson('/api/loans', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(loanData),
    });
    if (result.ok) return result.data;

    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const typePrefix = (loanData.financeType || 'daily')[0].toUpperCase();
    const newLoan = {
      ...loanData,
      _id: 'loan_' + Date.now(),
      loanNo: `VK-2026-${typePrefix}${String(loans.length + 1).padStart(3, '0')}`,
      paidInstallments: 0,
      totalPaid: 0,
      balanceAmount: loanData.totalRepayable || loanData.principalAmount,
      status: 'active',
      overdueDays: 0,
      penaltyApplied: 0,
      createdAt: new Date().toISOString(),
    };
    loans.unshift(newLoan);
    setStored(STORAGE_KEYS.LOANS, loans);
    return { success: true, loan: newLoan };
  },

  updateLoanStatus: async (id, statusData) => {
    const result = await safeFetchJson(`/api/loans/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(statusData),
    });
    if (result.ok) return result.data;

    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const index = loans.findIndex((l) => l._id === id);
    if (index !== -1) {
      loans[index] = { ...loans[index], ...statusData };
      setStored(STORAGE_KEYS.LOANS, loans);
      return { success: true, loan: loans[index] };
    }
    return { success: true };
  },

  // Payments
  getPayments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await safeFetchJson(`/api/payments?${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    let payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    if (params.search) {
      const q = params.search.toLowerCase();
      payments = payments.filter(
        (p) =>
          p.receiptNo.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.loanNo.toLowerCase().includes(q)
      );
    }
    return { success: true, count: payments.length, payments };
  },

  recordPayment: async (paymentData) => {
    const result = await safeFetchJson('/api/payments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });
    if (result.ok) return result.data;

    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);

    const receiptNo = `REC-2026-${String(payments.length + 1).padStart(4, '0')}`;
    const newPayment = {
      ...paymentData,
      _id: 'pay_' + Date.now(),
      receiptNo,
      paymentDate: new Date().toISOString(),
      collectedBy: 'Authorized FinTrack Agent',
    };
    payments.unshift(newPayment);
    setStored(STORAGE_KEYS.PAYMENTS, payments);

    // Update loan balance
    const loanIndex = loans.findIndex((l) => l._id === paymentData.loanId);
    let updatedLoan = null;
    if (loanIndex !== -1) {
      const targetLoan = loans[loanIndex];
      const newTotalPaid = (targetLoan.totalPaid || 0) + Number(paymentData.amount);
      const newBalance = Math.max(0, (targetLoan.totalRepayable || 0) - newTotalPaid);
      const newPaidInstallments = (targetLoan.paidInstallments || 0) + 1;
      targetLoan.totalPaid = newTotalPaid;
      targetLoan.balanceAmount = newBalance;
      if (newBalance <= 0) {
        targetLoan.status = 'completed';
        targetLoan.settledDate = new Date().toISOString();
      }
      updatedLoan = targetLoan;
      setStored(STORAGE_KEYS.LOANS, loans);
    }

    return { success: true, payment: newPayment, loan: updatedLoan };
  },

  deletePayment: async (id) => {
    const result = await safeFetchJson(`/api/payments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;

    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const filtered = payments.filter((p) => p._id !== id);
    setStored(STORAGE_KEYS.PAYMENTS, filtered);
    return { success: true };
  },

  // Reports
  getDailyClosingReport: async (date) => {
    const query = date ? `?date=${date}` : '';
    const result = await safeFetchJson(`/api/reports/daily-closing${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return {
      success: true,
      report: {
        date: date || new Date().toISOString().slice(0, 10),
        totalCollections: totalCollected,
        totalDisbursed: 0,
        netCash: totalCollected,
        payments,
      },
    };
  },

  downloadDatabaseBackup: async () => {
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const settings = getStored(STORAGE_KEYS.SETTINGS, initialSettings);
    const investments = getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments);

    const blob = new Blob(
      [JSON.stringify({ customers, loans, payments, settings, investments }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VK_BANKERS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    return { success: true };
  },

  // Settings
  getSettings: async () => {
    const result = await safeFetchJson('/api/settings', { headers: getHeaders() });
    if (result.ok) return result.data;

    const settings = getStored(STORAGE_KEYS.SETTINGS, initialSettings);
    return { success: true, settings };
  },

  updateSettings: async (settingsData) => {
    const result = await safeFetchJson('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settingsData),
    });
    if (result.ok) return result.data;

    const settings = getStored(STORAGE_KEYS.SETTINGS, initialSettings);
    const updated = { ...settings, ...settingsData };
    setStored(STORAGE_KEYS.SETTINGS, updated);
    return { success: true, settings: updated };
  },

  getAuditLogs: async () => {
    const result = await safeFetchJson('/api/settings/audit-logs', { headers: getHeaders() });
    if (result.ok) return result.data;
    return { success: true, logs: [] };
  },

  // WhatsApp
  getWhatsAppStatus: async () => {
    const result = await safeFetchJson('/api/whatsapp/status', { headers: getHeaders() });
    if (result.ok) return result.data;
    return { success: true, status: 'ready', phone: '+91 98421 12345' };
  },

  generateWhatsAppCode: async (phone) => {
    const result = await safeFetchJson('/api/whatsapp/generate-code', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
    if (result.ok) return result.data;
    return { success: true, pairingCode: '3P5HDMVA' };
  },

  logoutWhatsApp: async () => {
    const result = await safeFetchJson('/api/whatsapp/logout', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;
    return { success: true };
  },

  reconnectWhatsApp: async () => {
    const result = await safeFetchJson('/api/whatsapp/reconnect', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;
    return { success: true };
  },

  sendWhatsAppReminder: async (data) => {
    const result = await safeFetchJson('/api/whatsapp/send-reminder', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (result.ok) return result.data;
    // Fallback: open WhatsApp web click to chat directly!
    const phone = (data.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : '91' + phone;
    const encoded = encodeURIComponent(data.message || 'VK BANKER\'S & FINANCE payment reminder.');
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    return { success: true, sentDirectly: true };
  },

  // Investments
  getInvestments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await safeFetchJson(`/api/investments?${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    const investments = getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments);
    return { success: true, investments };
  },

  createInvestment: async (data) => {
    const result = await safeFetchJson('/api/investments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (result.ok) return result.data;

    const investments = getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments);
    const newInv = {
      ...data,
      _id: 'inv_' + Date.now(),
      status: 'active',
      totalReturned: 0,
      createdAt: new Date().toISOString(),
    };
    investments.unshift(newInv);
    setStored(STORAGE_KEYS.INVESTMENTS, investments);
    return { success: true, investment: newInv };
  },

  recordInvestmentReturn: async (id, data) => {
    const result = await safeFetchJson(`/api/investments/${id}/return`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (result.ok) return result.data;

    const investments = getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments);
    const index = investments.findIndex((i) => i._id === id);
    if (index !== -1) {
      investments[index].totalReturned = (investments[index].totalReturned || 0) + Number(data.amount);
      setStored(STORAGE_KEYS.INVESTMENTS, investments);
      return { success: true, investment: investments[index] };
    }
    return { success: true };
  },

  deleteInvestment: async (id) => {
    const result = await safeFetchJson(`/api/investments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;

    const investments = getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments);
    const filtered = investments.filter((i) => i._id !== id);
    setStored(STORAGE_KEYS.INVESTMENTS, filtered);
    return { success: true };
  },

  // Expenses Management
  getExpenses: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await safeFetchJson(`/api/expenses?${query}`, { headers: getHeaders() });
    if (result.ok) return result.data;

    let expenses = getStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    if (params.category && params.category !== 'all') {
      expenses = expenses.filter((e) => e.category === params.category);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (e.receiptNo && e.receiptNo.toLowerCase().includes(q))
      );
    }
    if (params.startDate) {
      expenses = expenses.filter((e) => (e.date || '').slice(0, 10) >= params.startDate);
    }
    if (params.endDate) {
      expenses = expenses.filter((e) => (e.date || '').slice(0, 10) <= params.endDate);
    }
    return { success: true, count: expenses.length, totalCount: expenses.length, expenses };
  },

  createExpense: async (data) => {
    const result = await safeFetchJson('/api/expenses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (result.ok) return result.data;

    const expenses = getStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    const receiptNo = `EXP-2026-${String(expenses.length + 1).padStart(4, '0')}`;
    const newExp = {
      ...data,
      _id: 'exp_' + Date.now(),
      receiptNo,
      date: data.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    setStored(STORAGE_KEYS.EXPENSES, expenses);
    return { success: true, expense: newExp };
  },

  deleteExpense: async (id) => {
    const result = await safeFetchJson(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (result.ok) return result.data;

    const expenses = getStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    const filtered = expenses.filter((e) => e._id !== id);
    setStored(STORAGE_KEYS.EXPENSES, filtered);
    return { success: true, expenseId: id };
  },

  getExpenseSummary: async () => {
    const result = await safeFetchJson('/api/expenses/summary', { headers: getHeaders() });
    if (result.ok) return result.data;

    const expenses = getStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayExpenses = expenses
      .filter((e) => (e.date || '').startsWith(todayStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthlyExpenses = expenses
      .filter((e) => (e.date || '').startsWith(monthStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      success: true,
      summary: {
        totalExpenses,
        totalExpensesCount: expenses.length,
        todayExpenses,
        monthlyExpenses,
      },
    };
  },
};

export default api;
