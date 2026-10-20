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
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Payments from './pages/Payments';
import Investments from './pages/Investments';
import DailyClosing from './pages/DailyClosing';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import api from './services/api';

export function App() {
  const { user, loading, isOwner } = useAuth();
  const { isMobile, isTablet, isLaptop, isRealPhone } = useDeviceMode();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [loanFilterType, setLoanFilterType] = useState('all');

  // Quick Action Modals triggered by shortcuts, Navbar, or mobile FAB
  const [showGlobalLoanModal, setShowGlobalLoanModal] = useState(false);
  const [showGlobalPayModal, setShowGlobalPayModal] = useState(false);
  const [showGlobalInvestmentModal, setShowGlobalInvestmentModal] = useState(false);
  const [showGlobalCustomerModal, setShowGlobalCustomerModal] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [globalWhatsappItem, setGlobalWhatsappItem] = useState(null);
  const [globalPayItem, setGlobalPayItem] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);

  // Fetch customers for the quick loan modal
  const fetchModalData = async () => {
    try {
      const res = await api.getCustomers();
      if (res.success) setCustomers(res.customers || []);
      const loansRes = await api.getLoans({ status: 'active' });
      if (loansRes.success) setActiveLoans(loansRes.loans || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchNotificationsCount = async () => {
    try {
      const statsRes = await api.getDashboardStats();
      const overdue = (statsRes?.overdueLoans || []).length;
      const todayDue = (statsRes?.todayDueList || []).filter((i) => !i.isPaidToday).length;
      setNotificationCount(overdue + todayDue);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchModalData();
      fetchNotificationsCount();
      const interval = setInterval(fetchNotificationsCount, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Global Keyboard Shortcuts (N = New Loan, P = Payment, / = Search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && isOwner) {
        e.preventDefault();
        setShowGlobalLoanModal(true);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setShowGlobalPayModal(true);
      } else if ((e.key === 'i' || e.key === 'I') && isOwner) {
        e.preventDefault();
        setShowGlobalInvestmentModal(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-950 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-sky-200 tracking-wider">Loading FinTrack Sky Blue...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleTabChange = (tab) => {
    setSelectedLoanId(null);
    setSelectedCustomerId(null);
    setActiveTab(tab);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden ${
        isMobile && !isRealPhone
          ? 'max-w-[440px] mx-auto border-x border-sky-200/40 dark:border-sky-900/40 shadow-2xl'
          : 'w-full'
      }`}
    >
      {/* Floating Sky-Blue Blurred Background Orbs */}
      <BackgroundOrbs />

      {/* Top App Bar */}
      <Navbar
        onOpenSearch={() => {
          const input = document.querySelector('input[type="text"]');
          if (input) input.focus();
        }}
        onAddPayment={() => setShowGlobalPayModal(true)}
        onOpenMoreSheet={() => setShowMoreSheet(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={notificationCount}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        {/* Desktop / Tablet Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onOpenNotifications={() => setShowNotifications(true)}
          unreadNotificationsCount={notificationCount}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 p-3 sm:p-6 lg:p-8 max-w-full overflow-hidden ${
            isMobile ? 'pb-28' : 'pb-10'
          }`}
        >
          {selectedLoanId ? (
            <LoanDetail
              loanId={selectedLoanId}
              onBack={() => setSelectedLoanId(null)}
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
              {activeTab === 'dashboard' && (
                <Dashboard
                  onSelectFinanceType={(type) => {
                    setLoanFilterType(type);
                    setActiveTab('loans');
                  }}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                  onOpenPayment={() => setShowGlobalPayModal(true)}
                  onOpenNewLoan={() => setShowGlobalLoanModal(true)}
                  onOpenInvestment={() => setShowGlobalInvestmentModal(true)}
                />
              )}

              {activeTab === 'customers' && (
                <Customers onViewCustomer={(id) => setSelectedCustomerId(id)} />
              )}

              {activeTab === 'loans' && (
                <Loans
                  initialType={loanFilterType}
                  onViewLoan={(id) => setSelectedLoanId(id)}
                />
              )}

              {activeTab === 'payments' && <Payments />}

              {activeTab === 'investments' && (
                <Investments onOpenNewInvestment={() => setShowGlobalInvestmentModal(true)} />
              )}

              {activeTab === 'dailyClosing' && <DailyClosing />}

              {activeTab === 'calendar' && <Calendar />}

              {activeTab === 'settings' && <Settings />}
            </>
          )}
        </main>
      </div>

      {/* Mobile-First Bottom Navigation Bar (5 tabs) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenMoreSheet={() => setShowMoreSheet(true)}
      />

      {/* Mobile-Mode Round 56px Floating Action Button */}
      <FloatingPaymentButton
        onRecordPayment={() => setShowGlobalPayModal(true)}
        onAddLoan={() => setShowGlobalLoanModal(true)}
        onAddCustomer={() => setShowGlobalCustomerModal(true)}
        onAddInvestment={() => setShowGlobalInvestmentModal(true)}
      />

      {/* Slide-in More / Settings Sheet */}
      <MobileMoreSheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onSelectTab={handleTabChange}
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={notificationCount}
      />

      {/* Global Quick Loan Modal (N shortcut or Mobile FAB) */}
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

      {/* Global Quick Payment Modal (P shortcut, Navbar button, or Mobile FAB) */}
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

      {/* Global Quick Customer Modal (Mobile FAB) */}
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

      {/* Global Quick Investment Modal (I shortcut, FAB, or Investments page) */}
      {showGlobalInvestmentModal && (
        <InvestmentModal
          onClose={() => setShowGlobalInvestmentModal(false)}
          onSuccess={() => {
            setShowGlobalInvestmentModal(false);
            setActiveTab('investments');
          }}
        />
      )}

      {/* Global Notification Modal / Drawer */}
      {showNotifications && (
        <NotificationModal
          isOpen={showNotifications}
          onClose={() => {
            setShowNotifications(false);
            fetchNotificationsCount();
          }}
          onRecordPayment={(item) => {
            setShowNotifications(false);
            setGlobalPayItem(item);
            setShowGlobalPayModal(true);
          }}
          onOpenWhatsApp={(item) => {
            setShowNotifications(false);
            setGlobalWhatsappItem(item);
          }}
          onViewLoan={(id) => {
            setShowNotifications(false);
            setSelectedLoanId(id);
          }}
        />
      )}

      {/* Global WhatsApp Reminder Modal */}
      {globalWhatsappItem && (
        <WhatsAppReminderModal
          item={globalWhatsappItem}
          onClose={() => setGlobalWhatsappItem(null)}
        />
      )}
    </div>
  );
}

export default App;
