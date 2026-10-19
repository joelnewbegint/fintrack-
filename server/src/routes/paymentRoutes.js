import express from 'express';
import { z } from 'zod';
import {
  recordPayment,
  getPayments,
  deletePayment,
} from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const paymentSchema = z.object({
  body: z.object({
    loanId: z.string().min(1, 'Loan ID is required'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    mode: z.enum(['cash', 'upi']).optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
  }),
});

router.use(protect);

router.get('/', getPayments);
router.post('/', validate(paymentSchema), recordPayment);
router.delete('/:id', restrictTo('owner'), deletePayment);

export default router;
