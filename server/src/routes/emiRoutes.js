import express from 'express';
import {
  getEMIDashboardStats,
  getEMILoans,
  getEMILoanById,
  createEMILoan,
  recordEMIPayment,
  reverseEMIPayment,
  getForeclosureQuote,
  forecloseEMILoan,
  rescheduleInstallment,
  getEMICustomers,
  createEMICustomer,
  exportEMIExcelReport,
} from '../controllers/emiController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All EMI routes require authentication and restrict to OWNER and EMI_AGENT
router.use(protect);
router.use(restrictTo('owner', 'emi_agent'));

// Dashboard stats
router.get('/dashboard', getEMIDashboardStats);

// EMI Customers
router.get('/customers', getEMICustomers);
router.post('/customers', createEMICustomer);

// EMI Loans
router.get('/loans', getEMILoans);
router.get('/loans/:id', getEMILoanById);
router.post('/loans', createEMILoan);

// Collections / Payments
router.post('/payments', recordEMIPayment);
// Reversal is restricted to Owner only
router.post('/payments/:id/reverse', restrictTo('owner'), reverseEMIPayment);

// Settlement & Rescheduling
router.get('/loans/:id/foreclosure-quote', getForeclosureQuote);
router.post('/loans/:id/foreclose', forecloseEMILoan);
router.post('/loans/:id/reschedule', rescheduleInstallment);

// Excel Export
router.get('/export/excel', exportEMIExcelReport);

export default router;

