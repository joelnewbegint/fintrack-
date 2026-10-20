import express from 'express';
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
} from '../controllers/expenseController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.post('/', createExpense);
router.delete('/:id', restrictTo('owner'), deleteExpense);

export default router;
