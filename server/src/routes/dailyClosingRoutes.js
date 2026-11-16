import express from 'express';
import {
  getDailyClosings,
  getDailyClosingById,
  createDailyClosing,
  updateDailyClosing,
  deleteDailyClosing,
} from '../controllers/dailyClosingController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getDailyClosings);
router.get('/:id', getDailyClosingById);
router.post('/', createDailyClosing);
router.put('/:id', updateDailyClosing);
router.delete('/:id', restrictTo('owner'), deleteDailyClosing);

export default router;
