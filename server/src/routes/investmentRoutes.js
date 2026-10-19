import express from 'express';
import {
  getInvestments,
  createInvestment,
  recordReturn,
  deleteInvestment,
} from '../controllers/investmentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('owner'));

router.get('/', getInvestments);
router.post('/', createInvestment);
router.post('/:id/return', recordReturn);
router.delete('/:id', deleteInvestment);

export default router;
