import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useDeviceMode } from './context/DeviceModeContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import BottomNav from './components/common/BottomNav';
import BackgroundOrbs from './components/common/BackgroundOrbs';
import FloatingPaymentButton from './components/common/FloatingPaymentButton';
import MobileMoreSheet from './components/common/MobileMoreSheet';
import LoanModal from './components/common/LoanModal';
import PaymentModal from './components/common/PaymentModal';
import InvestmentModal from './components/common/InvestmentModal';
import CustomerModal from './components/common/CustomerModal';
import NotificationModal from './components/common/NotificationModal';
import WhatsAppReminderModal from './components/common/WhatsAppReminderModal';
import WhatsAppHubModal from './components/common/WhatsAppHubModal';
import PWAInstallModal from './components/common/PWAInstallModal';
import LoanApplicationFormModal from './components/common/LoanApplicationFormModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import SchemeLoansPage from './pages/SchemeLoansPage';
import ClosedLoansPage from './pages/ClosedLoansPage';
import LoanDetail from './pages/LoanDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Payments from './pages/Payments';
import Investments from './pages/Investments';
import Expenses from './pages/Expenses';
import DailyClosing from './pages/DailyClosing';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Agents from './pages/Agents';
import OverviewDashboard from './pages/OverviewDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import EmiLayout from './components/emi/EmiLayout';
import EMIDashboard from './pages/emi/EMIDashboard';
import EMIList from './pages/emi/EMIList';
import EMIDetail from './pages/emi/EMIDetail';
import EMIReceipts from './pages/emi/EMIReceipts';
import EMICustomers from './pages/emi/EMICustomers';
import EMIReports from './pages/emi/EMIReports';
import NewEMILoanModal from './pages/emi/NewEMILoanModal';
import CollectEMIModal from './pages/emi/CollectEMIModal';
import api from './services/api';

export function App() {
  const { user, loading, isOwner, isLoanAgent, isEmiAgent, isClient } = useAuth();
  const { isMobile, isTablet, isLaptop, isRealPhone } = useDeviceMode();

  // Role-based activeTab default
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      if (path === '/dailyclosing' || path === '/daily-closing') return 'dailyClosing';
      if (path === '/customers') return 'customers';
      if (path === '/payments') return 'payments';
      if (path === '/investments') return 'investments';
      if (path === '/expenses') return 'expenses';
      if (path === '/calendar') return 'calendar';
      if (path === '/settings') return 'settings';
      if (path === '/agents') return 'agents';
      if (path === '/loans/closed') return 'closed-loans';
      if (path === '/loans/daily' || path === '/loans/weekly' || path === '/loans/monthly') return 'scheme-loans';
      if (path === '/loans') return 'loans';

      const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
      const stored = isRemembered
        ? localStorage.getItem('fintrack_user')
        : sessionStorage.getItem('fintrack_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role === 'emi_agent') return 'emiDashboard';
        if (u.role === 'owner' || u.role === 'admin') return 'dashboard';
      }
    } catch (e) {}
    return 'dashboard';
  });

  // Owner 2-way mode switch: 'loans' | 'emi'
  const [ownerMode, setOwnerMode] = useState(() => {
    try {
      const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
      const stored = isRemembered
        ? localStorage.getItem('fintrack_user')
        : sessionStorage.getItem('fintrack_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role === 'emi_agent') return 'emi';
        if (u.role === 'owner' || u.role === 'admin') return 'loans';
      }
    } catch (e) {}
    return 'loans';
  });

  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedEMILoanId, setSelectedEMILoanId] = useState(null);
  const [loanFilterType, setLoanFilterType] = useState('all');
  const [emiListFilter, setEmiListFilter] = useState('active');
  const [selectedScheme, setSelectedScheme] = useState('daily');
  const [activeEmiTab, setActiveEmiTab] = useState(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      if (path === '/emi/list' || path === '/emi/accounts') return 'list';
      if (path === '/emi/receipts') return 'receipts';
      if (path === '/emi/customers') return 'customers';
      if (path === '/emi/reports') return 'reports';
    } catch (e) {}
    return 'dashboard';
  });

  // Synchronize URL route with scheme loans pages and dedicated EMI routes
  useEffect(() => {
    const handleUrlRouting = () => {
      try {
        const path = window.location.pathname.toLowerCase();

        if (path === '/emi' || path.startsWith('/emi/')) {
          if (isLoanAgent) {
            window.history.replaceState({}, '', '/loans');
            setActiveTab('loans');
            setOwnerMode('loans');
            return;
          }
          setOwnerMode('emi');
          if (path === '/emi/list' || path === '/emi/accounts') {
            setActiveEmiTab('list');
          } else if (path === '/emi/receipts') {
            setActiveEmiTab('receipts');
          } else if (path === '/emi/customers') {
            setActiveEmiTab('customers');
          } else if (path === '/emi/reports') {
            setActiveEmiTab('reports');
          } else {
            setActiveEmiTab('dashboard');
          }
        } else if (path === '/loans/daily') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setSelectedScheme('daily');
          setActiveTab('scheme-loans');
          setOwnerMode('loans');
        } else if (path === '/loans/weekly') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setSelectedScheme('weekly');
          setActiveTab('scheme-loans');
          setOwnerMode('loans');
        } else if (path === '/loans/monthly') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setSelectedScheme('monthly');
          setActiveTab('scheme-loans');
          setOwnerMode('loans');
        } else if (path === '/loans/closed') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setActiveTab('closed-loans');
          setOwnerMode('loans');
        } else if (path === '/loans') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setActiveTab('loans');
          setOwnerMode('loans');
        } else if (path === '/dailyclosing' || path === '/daily-closing') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          setActiveTab('dailyClosing');
          setOwnerMode('loans');
        } else if (path === '/customers') {
          if (isEmiAgent) return;
          setActiveTab('customers');
          setOwnerMode('loans');
        } else if (path === '/payments') {
          if (isEmiAgent) return;
          setActiveTab('payments');
          setOwnerMode('loans');
        } else if (path === '/investments') {
          if (isEmiAgent || isLoanAgent) return;
          setActiveTab('investments');
          setOwnerMode('loans');
        } else if (path === '/expenses') {
          if (isEmiAgent || isLoanAgent) return;
          setActiveTab('expenses');
          setOwnerMode('loans');
        } else if (path === '/calendar') {
          setActiveTab('calendar');
          setOwnerMode('loans');
        } else if (path === '/settings') {
          setActiveTab('settings');
          setOwnerMode('loans');
        } else if (path === '/agents') {
          if (isEmiAgent || isLoanAgent) return;
          setActiveTab('agents');
          setOwnerMode('loans');
        } else if (path === '/overview' || path === '/' || path === '/dashboard' || path === '') {
          if (isEmiAgent) {
            window.history.replaceState({}, '', '/emi');
            setOwnerMode('emi');
            setActiveEmiTab('dashboard');
            return;
          }
          if (path === '/overview') {
            window.history.replaceState({}, '', '/');
          }
          setActiveTab('dashboard');
          setOwnerMode('loans');
        }
      } catch (e) {}
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, [isLoanAgent, isEmiAgent]);

  // Enforce role isolation & redirect to appropriate default on role mismatch
  useEffect(() => {
    if (!user) return;

    if (isEmiAgent) {
      if (ownerMode !== 'emi') setOwnerMode('emi');
      if (typeof window !== 'undefined' && !window.location.pathname.toLowerCase().startsWith('/emi')) {
        window.history.replaceState({}, '', '/emi');
      }
    } else if (isLoanAgent) {
      if (ownerMode === 'emi') setOwnerMode('loans');
      if (['overview', 'emiDashboard', 'emiList', 'agents', 'investments', 'expenses'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
      if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/emi')) {
        window.history.replaceState({}, '', '/loans');
      }
    } else if (isClient) {
      if (!['dashboard', 'loans', 'payments', 'settings'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [user, isEmiAgent, isLoanAgent, isClient, ownerMode, activeTab]);

  // Quick Action Modals
  const [showGlobalLoanModal, setShowGlobalLoanModal] = useState(false);
  const [showGlobalPayModal, setShowGlobalPayModal] = useState(false);
  const [showGlobalInvestmentModal, setShowGlobalInvestmentModal] = useState(false);
  const [showGlobalCustomerModal, setShowGlobalCustomerModal] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showWhatsAppHub, setShowWhatsAppHub] = useState(false);
  const [whatsappHubProps, setWhatsappHubProps] = useState({});
  const [globalPayItem, setGlobalPayItem] = useState(null);
  const [showLoanFormModal, setShowLoanFormModal] = useState(false);

  // New EMI Modals
  const [showNewEMILoanModal, setShowNewEMILoanModal] = useState(false);
  const [showGlobalEmiPayModal, setShowGlobalEmiPayModal] = useState(false);
  const [globalEmiPayItem, setGlobalEmiPayItem] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);

  // Sidebar Minimization State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('fintrack_sidebar_collapsed');
      if (saved !== null) return JSON.parse(saved);
      return false;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fintrack_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const fetchModalData = async () => {
    try {
      if (!isEmiAgent) {
        const res = await api.getCustomers();
        if (res.success) setCustomers(res.customers || []);
        const loansRes = await api.getLoans({ status: 'active' });
        if (loansRes.success) setActiveLoans(loansRes.loans || []);
      }
    } catch (e) {}
  };

  const fetchNotificationsCount = async () => {
    try {
      if (isEmiAgent) {
        const emiRes = await api.getEMIDashboardStats();
        if (emiRes.success) {
          setNotificationCount((emiRes.stats?.todayDueCount || 0) + (emiRes.stats?.overdueCount || 0));
        }
      } else {
        const statsRes = await api.getDashboardStats();
        const overdue = (statsRes?.overdueLoans || []).length;
        const todayDue = (statsRes?.todayDueList || []).filter((i) => !i.isPaidToday).length;
        setNotificationCount(overdue + todayDue);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      fetchModalData();
      fetchNotificationsCount();
      const interval = setInterval(fetchNotificationsCount, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && isOwner) {
        e.preventDefault();
        if (ownerMode === 'emi') setShowNewEMILoanModal(true);
        else setShowGlobalLoanModal(true);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (ownerMode === 'emi') setShowGlobalEmiPayModal(true);
        else setShowGlobalPayModal(true);
      } else if ((e.key === 'i' || e.key === 'I') && isOwner) {
        e.preventDefault();
        setShowGlobalInvestmentModal(true);
      } else if ((e.key === 'm' || e.key === 'M' || e.key === '[') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner, ownerMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-orange-200 tracking-wider">Loading VK Banker's & Finance...</p>
        </div>
      </div>
    );
  }

  // ProtectedRoute enforcement: unauthenticated users redirected to Login
  if (!user) {
    return <Login />;
  }

  const handleTabChange = (tab) => {
    setSelectedLoanId(null);
    setSelectedCustomerId(null);
    setSelectedEMILoanId(null);

    if (tab === 'emiDashboard' || tab === 'emiList') {
      setOwnerMode('emi');
      setActiveEmiTab(tab === 'emiList' ? 'list' : 'dashboard');
      try { window.history.pushState({}, '', tab === 'emiList' ? '/emi/list' : '/emi'); } catch (e) {}
    } else if (tab === 'closed-loans') {
      setOwnerMode('loans');
      setActiveTab('closed-loans');
      try { window.history.pushState({}, '', '/loans/closed'); } catch (e) {}
    } else if (tab === 'dailyClosing') {
      setOwnerMode('loans');
      setActiveTab('dailyClosing');
      try { window.history.pushState({}, '', '/dailyClosing'); } catch (e) {}
    } else {
      setOwnerMode('loans');
      setActiveTab(tab === 'overview' ? 'dashboard' : tab);
      try { window.history.pushState({}, '', tab === 'loans' ? '/loans' : `/${tab}`); } catch (e) {}
    }
  };

  const handleNavigateToScheme = (scheme) => {
    setSelectedLoanId(null);
    setSelectedCustomerId(null);
    setSelectedEMILoanId(null);
    setSelectedScheme(scheme);
    setActiveTab('scheme-loans');
    setOwnerMode('loans');
    try {
      window.history.pushState({ scheme }, '', `/loans/${scheme}`);
    } catch (e) {}
  };

  const handleBackFromScheme = () => {
    setSelectedLoanId(null);
    setActiveTab('loans');
    setOwnerMode('loans');
    try {
      window.history.pushState({}, '', '/loans');
    } catch (e) {}
  };

  // DEDICATED EMI PANEL VIEW (/emi) WITH STRICT ROLE BOUNDARY
  if (user && (isEmiAgent || ownerMode === 'emi')) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin', 'emi_agent']}>
        <EmiLayout
          activeEmiTab={activeEmiTab}
          setActiveEmiTab={(tab) => {
            setSelectedEMILoanId(null);
            setActiveEmiTab(tab);
            try {
              window.history.pushState({}, '', tab === 'dashboard' ? '/emi' : `/emi/${tab}`);
            } catch (e) {}
          }}
          onOpenCollectModal={() => {
            setGlobalEmiPayItem(null);
            setShowGlobalEmiPayModal(true);
          }}
          onOpenNewLoanModal={() => setShowNewEMILoanModal(true)}
          onSwitchToLoans={() => {
            setSelectedEMILoanId(null);
            setOwnerMode('loans');
            setActiveTab('loans');
            try {
              window.history.pushState({}, '', '/loans');
            } catch (e) {}
          }}
        >
          {selectedEMILoanId ? (
            <EMIDetail
              loanId={selectedEMILoanId}
              onBack={() => setSelectedEMILoanId(null)}
              onOpenCollectModal={(item) => {
                setGlobalEmiPayItem(item);
                setShowGlobalEmiPayModal(true);
              }}
            />
          ) : activeEmiTab === 'dashboard' ? (
            <EMIDashboard
              onOpenNewEMILoan={() => setShowNewEMILoanModal(true)}
              onOpenCollectModal={(item) => {
                setGlobalEmiPayItem(item || {});
                setShowGlobalEmiPayModal(true);
              }}
              onViewLoan={(id) => setSelectedEMILoanId(id)}
              onNavigateToList={(tab) => {
                setEmiListFilter(tab || 'active');
                setActiveEmiTab('list');
                try {
                  window.history.pushState({}, '', '/emi/list');
                } catch (e) {}
              }}
              onNavigateToCustomers={() => {
                setActiveEmiTab('customers');
                try {
                  window.history.pushState({}, '', '/emi/customers');
                } catch (e) {}
              }}
            />
          ) : activeEmiTab === 'list' ? (
            <EMIList
              initialTab={emiListFilter}
              onViewLoan={(id) => setSelectedEMILoanId(id)}
              onOpenNewLoan={() => setShowNewEMILoanModal(true)}
              onOpenCollectModal={(item) => {
                setGlobalEmiPayItem(item || {});
                setShowGlobalEmiPayModal(true);
              }}
            />
          ) : activeEmiTab === 'receipts' ? (
            <EMIReceipts />
          ) : activeEmiTab === 'customers' ? (
            <EMICustomers
              onOpenNewLoan={() => setShowNewEMILoanModal(true)}
              onViewCustomerLoans={(id) => setSelectedEMILoanId(id)}
            />
          ) : activeEmiTab === 'reports' ? (
            <EMIReports />
          ) : (
            <EMIDashboard
              onOpenNewEMILoan={() => setShowNewEMILoanModal(true)}
              onOpenCollectModal={(item) => {
                setGlobalEmiPayItem(item || {});
                setShowGlobalEmiPayModal(true);
              }}
              onViewLoan={(id) => setSelectedEMILoanId(id)}
              onNavigateToList={(tab) => {
                setEmiListFilter(tab || 'active');
                setActiveEmiTab('list');
              }}
            />
          )}

          {/* EMI Modals */}
          <NewEMILoanModal
            isOpen={showNewEMILoanModal}
            onClose={() => setShowNewEMILoanModal(false)}
            onSuccess={() => {
              setShowNewEMILoanModal(false);
              setActiveEmiTab('list');
            }}
          />

          <CollectEMIModal
            isOpen={showGlobalEmiPayModal}
            loanItem={globalEmiPayItem}
            onClose={() => {
              setShowGlobalEmiPayModal(false);
              setGlobalEmiPayItem(null);
            }}
            onSuccess={() => {
              fetchNotificationsCount();
            }}
          />
        </EmiLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin', 'loan_agent', 'agent', 'client']}>
      <div
        className={`min-h-screen flex flex-col font-sans relative overflow-x-clip ${
          isMobile && !isRealPhone
            ? 'max-w-[440px] mx-auto border-x border-orange-200/40 shadow-2xl'
            : 'w-full'
        }`}
      >
      <BackgroundOrbs />

      {/* Top App Bar */}
      <Navbar
        onSwitchToEMI={() => {
          setSelectedLoanId(null);
          setOwnerMode('emi');
          setActiveEmiTab('dashboard');
          try {
            window.history.pushState({}, '', '/emi');
          } catch (e) {}
        }}
        onOpenSearch={() => {
          const input = document.querySelector('input[type="text"]');
          if (input) input.focus();
        }}
        onAddPayment={() => {
          if (isEmiAgent || ownerMode === 'emi') setShowGlobalEmiPayModal(true);
          else setShowGlobalPayModal(true);
        }}
        onOpenMoreSheet={() => setShowMoreSheet(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenLoanForm={() => setShowLoanFormModal(true)}
        onOpenWhatsAppHub={(props) => {
          setWhatsappHubProps(props || {});
          setShowWhatsAppHub(true);
        }}
        unreadNotificationsCount={notificationCount}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div
        className={`flex-1 flex w-full relative z-10 ${
          isMobile && !isRealPhone
            ? 'max-w-[440px] mx-auto'
            : isTablet
            ? 'max-w-6xl mx-auto px-2 sm:px-4'
            : 'max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6'
        }`}
      >
        {/* Desktop / Tablet Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          selectedScheme={selectedScheme}
          onSelectScheme={handleNavigateToScheme}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenWhatsAppHub={(props) => {
            setWhatsappHubProps(props || {});
            setShowWhatsAppHub(true);
          }}
          onOpenLoanForm={() => setShowLoanFormModal(true)}
          unreadNotificationsCount={notificationCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 p-3 sm:p-5 lg:p-6 min-w-0 max-w-full overflow-x-clip ${
            isMobile ? 'pb-28' : 'pb-10'
          }`}
        >
          {/* Detail Views */}
          {selectedLoanId ? (
            <LoanDetail
              loanId={selectedLoanId}
              onBack={() => setSelectedLoanId(null)}
            />
          ) : selectedEMILoanId ? (
            <EMIDetail
              loanId={selectedEMILoanId}
              onBack={() => setSelectedEMILoanId(null)}
              onOpenCollectModal={(item) => {
                setGlobalEmiPayItem(item);
                setShowGlobalEmiPayModal(true);
              }}
            />
          ) : selectedCustomerId ? (
            <CustomerDetail
              customerId={selectedCustomerId}
              onBack={() => setSelectedCustomerId(null)}
              onViewLoan={(id) => {
                setSelectedCustomerId(null);
                setSelectedLoanId(id);
              }}
            />
          ) : (
            <>
              {/* Owner Overview */}
              {activeTab === 'overview' && (
                <OverviewDashboard
                  onSwitchToLoans={() => {
                    setOwnerMode('loans');
                    setActiveTab('dashboard');
                  }}
                  onSwitchToEMI={() => {
                    setOwnerMode('emi');
                    setActiveTab('emiDashboard');
                  }}
                />
              )}

              {/* Loans Module Dashboard & Pages */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  onSelectFinanceType={(type) => {
                    setLoanFilterType(type);
                    setActiveTab('loans');
                  }}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                  onOpenPayment={() => setShowGlobalPayModal(true)}
                  onOpenNewLoan={() => setShowGlobalLoanModal(true)}
                  onOpenNewCustomer={() => setShowGlobalCustomerModal(true)}
                  onOpenInvestment={() => setShowGlobalInvestmentModal(true)}
                  onOpenExpenses={() => setActiveTab('expenses')}
                />
              )}

              {activeTab === 'customers' && (
                <Customers onViewCustomer={(id) => setSelectedCustomerId(id)} />
              )}

              {activeTab === 'loans' && (
                <Loans
                  initialType={loanFilterType}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                  onSelectScheme={handleNavigateToScheme}
                />
              )}

              {activeTab === 'scheme-loans' && (
                <SchemeLoansPage
                  schemeType={selectedScheme}
                  onBack={handleBackFromScheme}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                  onOpenNewLoan={(scheme) => setShowGlobalLoanModal(true)}
                />
              )}

              {activeTab === 'closed-loans' && (
                <ClosedLoansPage
                  onBack={() => {
                    try { window.history.pushState({}, '', '/loans'); } catch (e) {}
                    setActiveTab('loans');
                  }}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                />
              )}

              {activeTab === 'payments' && <Payments />}

              {activeTab === 'investments' && isOwner && (
                <Investments onOpenNewInvestment={() => setShowGlobalInvestmentModal(true)} />
              )}

              {activeTab === 'expenses' && isOwner && (
                <Expenses onNavigateToDashboard={() => setActiveTab('dashboard')} />
              )}

              {activeTab === 'dailyClosing' && <DailyClosing />}

              {activeTab === 'calendar' && <Calendar />}

              {activeTab === 'settings' && <Settings />}

              {/* Owner-only Agent Management */}
              {activeTab === 'agents' && isOwner && <Agents />}

              {/* EMI Module Dashboard & List */}
              {activeTab === 'emiDashboard' && (
                <EMIDashboard
                  onOpenNewEMILoan={() => setShowNewEMILoanModal(true)}
                  onOpenCollectModal={(item) => {
                    setGlobalEmiPayItem(item || {});
                    setShowGlobalEmiPayModal(true);
                  }}
                  onViewLoan={(id) => setSelectedEMILoanId(id)}
                  onNavigateToList={(tab) => {
                    setEmiListFilter(tab || 'active');
                    setActiveTab('emiList');
                  }}
                />
              )}

              {activeTab === 'emiList' && (
                <EMIList
                  initialTab={emiListFilter}
                  onViewLoan={(id) => setSelectedEMILoanId(id)}
                  onOpenNewLoan={() => setShowNewEMILoanModal(true)}
                  onOpenCollectModal={(item) => {
                    setGlobalEmiPayItem(item || {});
                    setShowGlobalEmiPayModal(true);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenMoreSheet={() => setShowMoreSheet(true)}
      />

      {/* Mobile-Mode Round Floating Action Button */}
      {!isClient && (
        <FloatingPaymentButton
          onRecordPayment={() => {
            if (isEmiAgent || ownerMode === 'emi') setShowGlobalEmiPayModal(true);
            else setShowGlobalPayModal(true);
          }}
          onAddLoan={() => {
            if (isEmiAgent || ownerMode === 'emi') setShowNewEMILoanModal(true);
            else setShowGlobalLoanModal(true);
          }}
          onAddCustomer={() => setShowGlobalCustomerModal(true)}
          onAddInvestment={() => setShowGlobalInvestmentModal(true)}
        />
      )}

      {/* Slide-in More / Settings Sheet */}
      <MobileMoreSheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onSelectTab={handleTabChange}
        onSelectScheme={handleNavigateToScheme}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenLoanForm={() => setShowLoanFormModal(true)}
        onOpenWhatsAppHub={(props) => {
          setWhatsappHubProps(props || {});
          setShowWhatsAppHub(true);
        }}
        unreadNotificationsCount={notificationCount}
      />

      {/* Global Quick Loan Modal */}
      {showGlobalLoanModal && (
        <LoanModal
          customers={customers}
          onClose={() => setShowGlobalLoanModal(false)}
          onSuccess={() => {
            setShowGlobalLoanModal(false);
            fetchModalData();
            setActiveTab('loans');
          }}
        />
      )}

      {/* Global Quick Payment Modal */}
      {showGlobalPayModal && (
        <PaymentModal
          loanItem={globalPayItem}
          onClose={() => {
            setShowGlobalPayModal(false);
            setGlobalPayItem(null);
          }}
          onSuccess={() => {
            setShowGlobalPayModal(false);
            setGlobalPayItem(null);
            fetchModalData();
            fetchNotificationsCount();
            setActiveTab('payments');
          }}
        />
      )}

      {/* Global Quick Customer Modal */}
      {showGlobalCustomerModal && (
        <CustomerModal
          onClose={() => setShowGlobalCustomerModal(false)}
          onSuccess={() => {
            setShowGlobalCustomerModal(false);
            fetchModalData();
            setActiveTab('customers');
          }}
        />
      )}

      {/* Global Quick Investment Modal */}
      {showGlobalInvestmentModal && (
        <InvestmentModal
          onClose={() => setShowGlobalInvestmentModal(false)}
          onSuccess={() => {
            setShowGlobalInvestmentModal(false);
            setActiveTab('investments');
          }}
        />
      )}

      {/* EMI Modals */}
      <NewEMILoanModal
        isOpen={showNewEMILoanModal}
        onClose={() => setShowNewEMILoanModal(false)}
        onSuccess={() => {
          setShowNewEMILoanModal(false);
          setActiveTab('emiList');
        }}
      />

      <CollectEMIModal
        isOpen={showGlobalEmiPayModal}
        loanItem={globalEmiPayItem}
        onClose={() => {
          setShowGlobalEmiPayModal(false);
          setGlobalEmiPayItem(null);
        }}
        onSuccess={() => {
          fetchNotificationsCount();
        }}
      />

      {/* WhatsApp Reminders & Notifications Modals */}
      {showNotifications && (
        <NotificationModal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onSelectLoan={(id) => {
            setShowNotifications(false);
            setSelectedLoanId(id);
          }}
          onQuickPay={(loan) => {
            setShowNotifications(false);
            setGlobalPayItem(loan);
            setShowGlobalPayModal(true);
          }}
        />
      )}

      {showWhatsAppHub && (
        <WhatsAppHubModal
          isOpen={showWhatsAppHub}
          onClose={() => setShowWhatsAppHub(false)}
          initialCustomerPhone={whatsappHubProps?.phone}
          initialCustomerName={whatsappHubProps?.name}
          initialLoanItem={whatsappHubProps?.loan}
        />
      )}

      {showLoanFormModal && (
        <LoanApplicationFormModal
          isOpen={showLoanFormModal}
          onClose={() => setShowLoanFormModal(false)}
        />
      )}
    </div>
  </ProtectedRoute>
  );
}

export default App;
