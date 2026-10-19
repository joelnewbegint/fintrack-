import express from 'express';
import { z } from 'zod';
import {
  createLoan,
  getLoans,
  getLoanById,
  updateLoanStatus,
} from '../controllers/loanController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const loanSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    principal: z.number().min(100, 'Principal must be at least 100'),
    interestPercent: z.number().min(0, 'Interest cannot be negative'),
    financeType: z.enum(['daily', 'weekly', 'monthly']),
    duration: z.number().min(1, 'Duration must be at least 1'),
    startDate: z.string().optional(),
    latePenaltyRate: z.number().optional(),
    notes: z.string().optional(),
  }),
});

router.use(protect);

router.get('/', getLoans);
router.get('/:id', getLoanById);
router.post('/', restrictTo('owner'), validate(loanSchema), createLoan);
router.patch('/:id/status', restrictTo('owner'), updateLoanStatus);

export default router;
