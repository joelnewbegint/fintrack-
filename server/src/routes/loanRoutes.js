import express from 'express';
import { z } from 'zod';
import {
  createLoan,
  getLoans,
  getLoanSummary,
  getLoanOverallSummary,
  getLoanById,
  updateLoanStatus,
  updateLoan,
  declareLoanHoliday,
  removeLoanHoliday,
  deleteLoan,
} from '../controllers/loanController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const loanSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    principal: z.number().min(100, 'Principal must be at least 100'),
    interestPercent: z.number().min(0, 'Interest cannot be negative').optional(),
    chargeAmount: z.number().optional(),
    interestType: z.enum(['deduction', 'addon']).optional(),
    totalPayable: z.number().optional(),
    installmentAmount: z.number().optional(),
    financeType: z.enum(['daily', 'weekly', 'monthly']),
    duration: z.number().min(1, 'Duration must be at least 1'),
    startDate: z.string().optional(),
    latePenaltyRate: z.number().optional(),
    notes: z.string().optional(),
    borrowerPhoto: z.string().optional(),
  }),
});

const updateLoanSchema = z.object({
  body: z.object({
    principal: z.number().min(100).optional(),
    interestPercent: z.number().min(0).optional(),
    chargeAmount: z.number().optional(),
    interestType: z.enum(['deduction', 'addon']).optional(),
    totalPayable: z.number().optional(),
    installmentAmount: z.number().optional(),
    financeType: z.enum(['daily', 'weekly', 'monthly']).optional(),
    duration: z.number().min(1).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['active', 'completed', 'overdue', 'defaulted']).optional(),
    latePenaltyRate: z.number().optional(),
    notes: z.string().optional(),
    borrowerPhoto: z.string().optional(),
  }),
});

router.use(protect);
router.use(restrictTo('owner', 'loan_agent'));

router.get('/summary/overall', getLoanOverallSummary);
router.get('/summary', getLoanSummary);
router.get('/', getLoans);
router.get('/:id', getLoanById);
router.post('/', restrictTo('owner'), validate(loanSchema), createLoan);
router.put('/:id', restrictTo('owner'), validate(updateLoanSchema), updateLoan);
router.patch('/:id', restrictTo('owner'), validate(updateLoanSchema), updateLoan);
router.patch('/:id/status', restrictTo('owner'), updateLoanStatus);
router.post('/:id/holiday', restrictTo('owner'), declareLoanHoliday);
router.delete('/:id/holiday', restrictTo('owner'), removeLoanHoliday);
router.delete('/:id', restrictTo('owner'), deleteLoan);

export default router;
