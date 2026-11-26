import express from 'express';
import {
  getEMIDashboardStats,
  getEMILoans,
  getEMILoanById,
  createEMILoan,
  updateEMILoan,
  deleteEMILoan,
  getEMIPayments,
  recordEMIPayment,
  reverseEMIPayment,
  getForeclosureQuote,
  forecloseEMILoan,
  rescheduleInstallment,
  getEMICustomers,
  createEMICustomer,
  updateEMICustomer,
  deleteEMICustomer,
  clearEMIData,
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
router.put('/customers/:id', updateEMICustomer);
router.delete('/customers/:id', restrictTo('owner'), deleteEMICustomer);

// EMI Loans
router.get('/loans', getEMILoans);
router.get('/loans/:id', getEMILoanById);
router.post('/loans', createEMILoan);
router.put('/loans/:id', restrictTo('owner'), updateEMILoan);
router.delete('/loans/:id', restrictTo('owner'), deleteEMILoan);

// Collections / Payments
router.get('/payments', getEMIPayments);
router.post('/payments', recordEMIPayment);
// Reversal is restricted to Owner only
router.post('/payments/:id/reverse', restrictTo('owner'), reverseEMIPayment);

// Settlement & Rescheduling
router.get('/loans/:id/foreclosure-quote', getForeclosureQuote);
router.post('/loans/:id/foreclose', forecloseEMILoan);
router.post('/loans/:id/reschedule', rescheduleInstallment);

// Owner-only Cleanup & Excel Export
router.post('/clear-all-data', restrictTo('owner'), clearEMIData);
router.get('/export/excel', exportEMIExcelReport);

export default router;

