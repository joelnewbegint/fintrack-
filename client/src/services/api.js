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

/**
 * Universal Fresh Start Reset:
 * Completely purges all customer records, loans, repayment ledgers, expenses, and investments
 * across all mobile phones, laptops, and tablets to provide a 100% clean, brand new system.
 */
export const resetToCleanSite = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const isClean = localStorage.getItem('fintrack_clean_fresh_site_v2');
    if (isClean !== 'true') {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));

      // Clear any legacy migration keys
      [
        'fintrack_real_dataset_v1',
        'fintrack_real_dataset_v2',
        'fintrack_real_dataset_v3',
        'fintrack_real_dataset_v4',
        'fintrack_real_dataset_v5',
        'fintrack_real_dataset_v6',
        'fintrack_real_dataset_v7',
        'fintrack_clean_fresh_site_v1',
      ].forEach((key) => localStorage.removeItem(key));

      localStorage.setItem('fintrack_clean_fresh_site_v2', 'true');
      console.log('✨ FinTrack: Successfully initialized 100% fresh, clean new site!');
    }
  } catch (err) {
    console.warn('Fresh site reset notice:', err);
  }
};

resetToCleanSite();

export const cleanseDumpData = () => {
  resetToCleanSite();
};

export const initRealDataset = () => {
  resetToCleanSite();
};

const getStored = (key, fallback = []) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      if (fallback !== undefined) {
        localStorage.setItem(key, JSON.stringify(fallback));
      }
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

/**
 * Resolves the active Backend Server API base URL:
 * 1. User manual override stored in localStorage (allows switching backend on any device!)
 * 2. Build-time Vite env variable (VITE_API_BASE_URL)
 * 3. Default to http://localhost:5000 if running on local dev machine
 * 4. Fallback to empty string (relative)
 */
export const getApiBaseUrl = () => {
  try {
    const userUrl =
      localStorage.getItem('fintrack_api_base_url') ||
      localStorage.getItem('fintrack_api_url');
    if (userUrl && userUrl.trim()) {
      return userUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {}

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If local development machine, default to port 5000
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5000';
  }

  return '';
};

export const setApiBaseUrl = (url) => {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('fintrack_api_base_url');
      localStorage.removeItem('fintrack_api_url');
    } else {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      localStorage.setItem('fintrack_api_base_url', cleanUrl);
      localStorage.setItem('fintrack_api_url', cleanUrl);
    }
  } catch (e) {
    console.warn('Could not save API base URL to localStorage:', e);
  }
};

// Check if response is valid JSON; returns { ok: true, data } or { ok: false, error }
const safeFetchJson = async (url, options = {}) => {
  try {
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const res = await fetch(fullUrl, options);
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

    // Helper to calculate interest/profit for any loan:
    // Handles upfront deduction loans (chargeAmount) and addon loans (totalRepayable - principal)
    const getLoanInterest = (l) => {
      if (Number(l.chargeAmount) > 0) return Number(l.chargeAmount);
      const rep = Number(l.totalRepayable || l.totalPayable || 0);
      const pr = Number(l.principalAmount || l.principal || 0);
      const disb = Number(l.disbursedAmount || 0);
      if (rep > pr) return rep - pr;
      if (disb > 0 && pr > disb) return pr - disb;
      if (Number(l.interestPercent) > 0 && pr > 0) return Math.round((pr * Number(l.interestPercent)) / 100);
      return 0;
    };

    // Active interest = expected interest currently sitting in active/running loans.
    // When a loan settles/completes, it leaves active loans, which automatically decreases activeInterest
    // and transfers into profitFromSettled!
    const activeInterest = activeLoans.reduce((sum, l) => sum + getLoanInterest(l), 0);

    // Total Settled Amount = sum of total repayments/settled amount across all completed loans
    const settledAmount = completedLoans.reduce((sum, l) => {
      const paid = Number(l.totalPaid || l.totalCollected || l.totalRepayable || l.totalPayable || 0);
      return sum + paid;
    }, 0);

    // Profit from Settled = realized profit from completed loans
    const profitFromSettled = completedLoans.reduce((sum, l) => sum + getLoanInterest(l), 0);

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
        profit: getLoanInterest(l),
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
    if (result.ok && result.data && Array.isArray(result.data.customers)) {
      return result.data;
    }

    let customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);

    // Compute active loans count, total loans count, and total outstanding for each customer
    const loanMap = {};
    const loanMapByName = {};

    loans.forEach((loan) => {
      const cid = String(loan.customerId?._id || loan.customerId || '');
      const notesClean = (loan.notes || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameClean = (loan.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const applyToBucket = (bucket) => {
        bucket.totalLoansCount += 1;
        const status = loan.status;
        const rem = Number(loan.remainingBalance != null ? loan.remainingBalance : loan.balanceAmount) || 0;
        if (status === 'active' || status === 'overdue' || rem > 0) {
          bucket.activeLoanCount += 1;
          bucket.totalOutstanding += rem;
        }
        const type = loan.financeType || 'daily';
        if (!bucket.types.includes(type)) {
          bucket.types.push(type);
        }
      };

      if (cid) {
        if (!loanMap[cid]) {
          loanMap[cid] = { activeLoanCount: 0, totalOutstanding: 0, totalLoansCount: 0, types: [] };
        }
        applyToBucket(loanMap[cid]);
      }

      // Also index by raw name keywords (e.g. thilaga, manchi, etc.)
      for (const token of [notesClean, nameClean]) {
        if (token) {
          if (!loanMapByName[token]) {
            loanMapByName[token] = { activeLoanCount: 0, totalOutstanding: 0, totalLoansCount: 0, types: [] };
          }
          applyToBucket(loanMapByName[token]);
        }
      }
    });

    customers = customers.map((c) => {
      const cNameClean = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cSimple = (c.name || '').toLowerCase().split('(')[0].trim().replace(/[^a-z0-9]/g, '');

      // Check ID first, then fuzzy name match
      let stats = loanMap[String(c._id)];
      if (!stats || stats.totalLoansCount === 0) {
        for (const [key, val] of Object.entries(loanMapByName)) {
          if (cSimple && (key.includes(cSimple) || cSimple.includes(key))) {
            stats = val;
            break;
          }
        }
      }

      stats = stats || {
        activeLoanCount: 0,
        totalOutstanding: 0,
        totalLoansCount: 0,
        types: [],
      };

      return {
        ...c,
        ...stats,
      };
    });

    const allAreas = Array.from(new Set(customers.map((c) => c.area).filter(Boolean)));

    if (params.area && params.area !== 'all') {
      customers = customers.filter((c) => c.area === params.area);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q))
      );
    }
    return { success: true, count: customers.length, areas: allAreas, customers };
  },

  getCustomerById: async (id) => {
    const result = await safeFetchJson(`/api/customers/${id}`, { headers: getHeaders() });
    if (result.ok && result.data) return result.data;

    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const customer = customers.find((c) => String(c._id) === String(id));
    let loans = getStored(STORAGE_KEYS.LOANS, initialLoans).filter(
      (l) => String(l.customerId?._id || l.customerId) === String(id)
    );
    let payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments).filter(
      (p) => String(p.customerId?._id || p.customerId) === String(id)
    );

    // Name fallback for loans/payments if not linked by ID
    if (customer) {
      const cSimple = (customer.name || '').toLowerCase().split('(')[0].trim();
      if (loans.length === 0 && cSimple) {
        loans = getStored(STORAGE_KEYS.LOANS, initialLoans).filter(
          (l) =>
            (l.notes && l.notes.toLowerCase().includes(cSimple)) ||
            (l.customerName && l.customerName.toLowerCase().includes(cSimple))
        );
      }
      if (payments.length === 0 && cSimple) {
        payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments).filter(
          (p) => p.notes && p.notes.toLowerCase().includes(cSimple)
        );
      }
    }

    return { success: true, customer, loans, payments };
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
    if (result.ok && result.data && Array.isArray(result.data.loans)) return result.data;

    let loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const customerMap = {};
    const customerNameMap = {};

    [...initialCustomers, ...customers].forEach((c) => {
      customerMap[String(c._id)] = c;
      const simple = (c.name || '').toLowerCase().split('(')[0].trim();
      if (simple) customerNameMap[simple] = c;
    });

    loans = loans.map((l) => {
      let cust = l.customerId;
      const rawCid = typeof cust === 'object' && cust !== null ? String(cust._id || '') : String(cust || '');

      // Resolve customer if missing or just an ID
      if (!cust || typeof cust !== 'object' || !cust.name) {
        if (rawCid && customerMap[rawCid]) {
          cust = customerMap[rawCid];
        } else if (l.notes) {
          for (const [key, val] of Object.entries(customerNameMap)) {
            if (l.notes.toLowerCase().includes(key)) {
              cust = val;
              break;
            }
          }
        }
      }

      const cName = (typeof cust === 'object' && cust ? cust.name : '') || l.customerName || 'Borrower';
      const cPhone = (typeof cust === 'object' && cust ? cust.phone : '') || l.customerPhone || '';
      const cArea = (typeof cust === 'object' && cust ? cust.area : '') || l.customerArea || '';

      const enrichedCust =
        typeof cust === 'object' && cust
          ? { ...cust, name: cName, phone: cPhone, area: cArea }
          : { _id: rawCid, name: cName, phone: cPhone, area: cArea };

      return {
        ...l,
        customerId: enrichedCust,
        customerName: cName,
        customerPhone: cPhone,
        customerArea: cArea,
        remainingBalance: Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0,
      };
    });

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
          (l.loanNo && l.loanNo.toLowerCase().includes(q)) ||
          (l.customerName && l.customerName.toLowerCase().includes(q)) ||
          (l.customerId?.name && l.customerId.name.toLowerCase().includes(q)) ||
          (l.customerPhone && l.customerPhone.includes(q))
      );
    }
    return { success: true, count: loans.length, loans };
  },

  getLoanById: async (id) => {
    const result = await safeFetchJson(`/api/loans/${id}`, { headers: getHeaders() });
    if (result.ok && result.data) return result.data;

    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const customerMap = {};
    const customerNameMap = {};

    [...initialCustomers, ...customers].forEach((c) => {
      customerMap[String(c._id)] = c;
      const simple = (c.name || '').toLowerCase().split('(')[0].trim();
      if (simple) customerNameMap[simple] = c;
    });

    let loan = loans.find((l) => String(l._id) === String(id));
    if (loan) {
      let cust = loan.customerId;
      const rawCid = typeof cust === 'object' && cust !== null ? String(cust._id || '') : String(cust || '');

      if (!cust || typeof cust !== 'object' || !cust.name) {
        if (rawCid && customerMap[rawCid]) {
          cust = customerMap[rawCid];
        } else if (loan.notes) {
          for (const [key, val] of Object.entries(customerNameMap)) {
            if (loan.notes.toLowerCase().includes(key)) {
              cust = val;
              break;
            }
          }
        }
      }

      const cName = (typeof cust === 'object' && cust ? cust.name : '') || loan.customerName || 'Borrower';
      const cPhone = (typeof cust === 'object' && cust ? cust.phone : '') || loan.customerPhone || '';
      const cArea = (typeof cust === 'object' && cust ? cust.area : '') || loan.customerArea || '';

      const enrichedCust =
        typeof cust === 'object' && cust
          ? { ...cust, name: cName, phone: cPhone, area: cArea }
          : { _id: rawCid, name: cName, phone: cPhone, area: cArea };

      loan = {
        ...loan,
        customerId: enrichedCust,
        customerName: cName,
        customerPhone: cPhone,
        customerArea: cArea,
      };
    }
    const payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments).filter(
      (p) => String(p.loanId?._id || p.loanId) === String(id)
    );
    return { success: true, loan, payments };
  },

  createLoan: async (loanData) => {
    const result = await safeFetchJson('/api/loans', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(loanData),
    });
    if (result.ok) return result.data;

    // If server responded with a specific API/validation error, do not silently swallow it
    if (result.error && !result.isHtml) {
      throw new Error(result.error);
    }

    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const targetCust = customers.find((c) => c._id === loanData.customerId);
    const typePrefix = (loanData.financeType || 'daily')[0].toUpperCase();

    const principalNum = Number(loanData.principal || loanData.principalAmount || 0);
    const interestPercentNum = Number(loanData.interestPercent || 0);
    const chargeAmountNum = Number(
      loanData.chargeAmount !== undefined
        ? loanData.chargeAmount
        : Math.round((principalNum * interestPercentNum) / 100)
    );
    const interestType = loanData.interestType || 'deduction';
    const disbursedAmount = interestType === 'deduction'
      ? Math.max(0, principalNum - chargeAmountNum)
      : principalNum;
    const totalPayable = Number(
      loanData.totalPayable !== undefined
        ? loanData.totalPayable
        : (interestType === 'deduction' ? principalNum : principalNum + chargeAmountNum)
    );
    const installmentAmount = Number(
      loanData.installmentAmount !== undefined
        ? loanData.installmentAmount
        : Math.ceil(totalPayable / (loanData.duration || 1))
    );

    const newLoan = {
      ...loanData,
      _id: 'loan_' + Date.now(),
      loanNo: `LN-${typePrefix}26-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: targetCust || {
        _id: loanData.customerId,
        name: loanData.customerName || 'Borrower',
        phone: loanData.customerPhone || '',
        area: loanData.customerArea || '',
      },
      customerName: targetCust?.name || loanData.customerName,
      customerPhone: targetCust?.phone || loanData.customerPhone,
      principal: principalNum,
      interestPercent: interestPercentNum,
      chargeAmount: chargeAmountNum,
      disbursedAmount,
      interestType,
      totalPayable,
      installmentAmount,
      balanceAmount: totalPayable,
      remainingBalance: totalPayable,
      totalCollected: 0,
      paidInstallments: 0,
      totalPaid: 0,
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
    if (result.ok && result.data && Array.isArray(result.data.payments)) return result.data;

    let payments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    const customers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const loans = getStored(STORAGE_KEYS.LOANS, initialLoans);

    const custMap = {};
    customers.forEach((c) => {
      custMap[String(c._id)] = c;
    });
    const loanMap = {};
    loans.forEach((l) => {
      loanMap[String(l._id)] = l;
    });

    payments = payments.map((p) => {
      const c = typeof p.customerId === 'object' && p.customerId !== null ? p.customerId : custMap[String(p.customerId)] || null;
      const l = typeof p.loanId === 'object' && p.loanId !== null ? p.loanId : loanMap[String(p.loanId)] || null;
      return {
        ...p,
        customerId: c || p.customerId,
        loanId: l || p.loanId,
        customerName: p.customerName || (c ? c.name : ''),
        loanNo: p.loanNo || (l ? l.loanNo : ''),
        paymentDate: p.paymentDate || p.date,
      };
    });

    if (params.search) {
      const q = params.search.toLowerCase();
      payments = payments.filter(
        (p) =>
          (p.receiptNo && p.receiptNo.toLowerCase().includes(q)) ||
          (p.customerName && p.customerName.toLowerCase().includes(q)) ||
          (p.loanNo && p.loanNo.toLowerCase().includes(q))
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

  // ----------------------------------------------------
  // Cloud Database & Cross-Device Sync Operations
  // ----------------------------------------------------
  getApiBaseUrl,
  setApiBaseUrl,

  getLocalCounts: () => {
    return {
      customers: getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers).length,
      loans: getStored(STORAGE_KEYS.LOANS, initialLoans).length,
      payments: getStored(STORAGE_KEYS.PAYMENTS, initialPayments).length,
      investments: getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments).length,
      expenses: getStored(STORAGE_KEYS.EXPENSES, initialExpenses).length,
    };
  },

  checkBackendHealth: async (overrideUrl) => {
    const baseUrl = overrideUrl !== undefined ? overrideUrl.trim().replace(/\/+$/, '') : getApiBaseUrl();
    if (!baseUrl) {
      return {
        online: false,
        reason: 'No backend server URL configured. App is operating in Local Device Storage mode.',
        isConfigured: false,
      };
    }

    const testUrl = `${baseUrl}/api/health`;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return {
          online: true,
          status: json.status || 'online',
          latency,
          url: baseUrl,
          database: 'MongoDB Atlas',
          isConfigured: true,
        };
      }
      return {
        online: false,
        status: res.status,
        latency,
        reason: `Server responded with HTTP ${res.status}`,
        isConfigured: true,
      };
    } catch (err) {
      return {
        online: false,
        latency: Date.now() - start,
        reason: err.name === 'AbortError' ? 'Connection timed out (6s)' : err.message,
        isConfigured: true,
      };
    }
  },

  syncLocalDataToCloud: async () => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error('Please configure a valid Backend Server URL first before syncing to cloud.');
    }

    const health = await api.checkBackendHealth();
    if (!health.online) {
      throw new Error(`Cannot connect to backend server: ${health.reason || 'Server offline'}`);
    }

    const localCustomers = getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const localLoans = getStored(STORAGE_KEYS.LOANS, initialLoans);
    const localPayments = getStored(STORAGE_KEYS.PAYMENTS, initialPayments);

    let syncedCust = 0;
    let syncedLoans = 0;
    let syncedPayments = 0;

    // Sync customers
    for (const c of localCustomers) {
      try {
        const payload = { ...c };
        delete payload._id; // Let MongoDB assign or match
        const res = await safeFetchJson('/api/customers', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (res.ok) syncedCust++;
      } catch (e) {
        // Customer may already exist
      }
    }

    // Sync loans
    for (const l of localLoans) {
      try {
        const payload = { ...l };
        delete payload._id;
        const res = await safeFetchJson('/api/loans', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (res.ok) syncedLoans++;
      } catch (e) {}
    }

    // Sync payments
    for (const p of localPayments) {
      try {
        const payload = { ...p };
        delete payload._id;
        const res = await safeFetchJson('/api/payments', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (res.ok) syncedPayments++;
      } catch (e) {}
    }

    return {
      success: true,
      synced: {
        customers: syncedCust,
        loans: syncedLoans,
        payments: syncedPayments,
      },
    };
  },

  downloadBackup: async () => {
    const data = {
      app: "VK BANKER'S & FINANCE",
      exportedAt: new Date().toISOString(),
      version: '1.0.6',
      customers: getStored(STORAGE_KEYS.CUSTOMERS, initialCustomers),
      loans: getStored(STORAGE_KEYS.LOANS, initialLoans),
      payments: getStored(STORAGE_KEYS.PAYMENTS, initialPayments),
      settings: getStored(STORAGE_KEYS.SETTINGS, initialSettings),
      investments: getStored(STORAGE_KEYS.INVESTMENTS, initialInvestments),
      expenses: getStored(STORAGE_KEYS.EXPENSES, initialExpenses),
    };

    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  },

  restoreBackup: async (jsonOrObject) => {
    let data = jsonOrObject;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (err) {
        throw new Error('Invalid JSON backup file: Could not parse text');
      }
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file format');
    }

    let customerCount = 0;
    let loanCount = 0;
    let paymentCount = 0;

    if (Array.isArray(data.customers)) {
      setStored(STORAGE_KEYS.CUSTOMERS, data.customers);
      customerCount = data.customers.length;
    }
    if (Array.isArray(data.loans)) {
      setStored(STORAGE_KEYS.LOANS, data.loans);
      loanCount = data.loans.length;
    }
    if (Array.isArray(data.payments)) {
      setStored(STORAGE_KEYS.PAYMENTS, data.payments);
      paymentCount = data.payments.length;
    }
    if (data.settings && typeof data.settings === 'object') {
      setStored(STORAGE_KEYS.SETTINGS, data.settings);
    }
    if (Array.isArray(data.investments)) {
      setStored(STORAGE_KEYS.INVESTMENTS, data.investments);
    }
    if (Array.isArray(data.expenses)) {
      setStored(STORAGE_KEYS.EXPENSES, data.expenses);
    }

    return {
      success: true,
      imported: {
        customers: customerCount,
        loans: loanCount,
        payments: paymentCount,
      },
    };
  },

  clearAllData: async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    }
    try {
      await safeFetchJson('/api/settings/clear-all-data', {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (e) {}
    return { success: true };
  },

  resetToCleanSite,
  cleanseDumpData,
  initRealDataset,
};

export default api;
