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

export const handleResponse = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  let data;
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON received from server (${res.status}).`);
    }
  } else {
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `Server connection error (${res.status}): Server returned HTML instead of JSON. Ensure the VK BANKER'S backend is running on http://localhost:5000.`
      );
    }
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Dashboard
  getDashboardStats: async () => {
    const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
    return handleResponse(res);
  },

  // Customers
  getCustomers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/customers?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getCustomerById: async (id) => {
    const res = await fetch(`/api/customers/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createCustomer: async (customerData) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    return handleResponse(res);
  },

  updateCustomer: async (id, customerData) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    return handleResponse(res);
  },

  deleteCustomer: async (id) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Loans
  getLoans: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/loans?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getLoanById: async (id) => {
    const res = await fetch(`/api/loans/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createLoan: async (loanData) => {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(loanData),
    });
    return handleResponse(res);
  },

  updateLoanStatus: async (id, statusData) => {
    const res = await fetch(`/api/loans/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(statusData),
    });
    return handleResponse(res);
  },

  // Payments
  getPayments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/payments?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  recordPayment: async (paymentData) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleResponse(res);
  },

  deletePayment: async (id) => {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  getDailyClosing: async (date) => {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`/api/reports/daily-closing${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  downloadBackup: async () => {
    const token = localStorage.getItem('fintrack_token');
    const res = await fetch('/api/reports/backup', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Backup download failed');
    return res.blob();
  },

  // Settings & Audits
  getSettings: async () => {
    const res = await fetch('/api/settings', { headers: getHeaders() });
    return handleResponse(res);
  },

  updateSettings: async (settingsData) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settingsData),
    });
    return handleResponse(res);
  },

  getAuditLogs: async () => {
    const res = await fetch('/api/settings/audit-logs', { headers: getHeaders() });
    return handleResponse(res);
  },

  // WhatsApp Connect & Messaging
  getWhatsAppStatus: async () => {
    const res = await fetch('/api/whatsapp/status', { headers: getHeaders() });
    return handleResponse(res);
  },

  generateWhatsAppCode: async (phoneNumber) => {
    const res = await fetch('/api/whatsapp/generate-code', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phoneNumber }),
    });
    return handleResponse(res);
  },

  logoutWhatsApp: async () => {
    const res = await fetch('/api/whatsapp/logout', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  reconnectWhatsApp: async () => {
    const res = await fetch('/api/whatsapp/reconnect', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  sendWhatsAppReminder: async (data) => {
    const res = await fetch('/api/whatsapp/send-reminder', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Capital Investments
  getInvestments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/investments?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createInvestment: async (data) => {
    const res = await fetch('/api/investments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  recordInvestmentReturn: async (id, data) => {
    const res = await fetch(`/api/investments/${id}/return`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteInvestment: async (id) => {
    const res = await fetch(`/api/investments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

export default api;
