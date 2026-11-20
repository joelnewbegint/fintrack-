import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Login from '../../pages/Login';

/**
 * ProtectedRoute Component
 * - Blocks unauthenticated users and displays Login screen.
 * - Enforces role-based permissions (allowedRoles: ['owner', 'loan_agent', 'emi_agent']).
 * - Redirects unauthorized roles to their designated home route.
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, token, loading, isOwner, isLoanAgent, isEmiAgent } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login
  if (!user || !token) {
    return <Login />;
  }

  // If specific roles are required, verify access
  if (allowedRoles.length > 0) {
    const userRole = user.role || 'client';
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (allowedRoles.includes('owner') && isOwner) ||
      (allowedRoles.includes('loan_agent') && isLoanAgent) ||
      (allowedRoles.includes('emi_agent') && isEmiAgent);

    if (!isAllowed) {
      // Role unauthorized: redirect to allowed section
      if (isEmiAgent) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/emi') {
          window.history.replaceState({}, '', '/emi');
        }
      } else if (isLoanAgent) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/loans') {
          window.history.replaceState({}, '', '/loans');
        }
      }
      return null;
    }
  }

  return children;
};

export default ProtectedRoute;

