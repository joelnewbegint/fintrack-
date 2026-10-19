import express from 'express';
import { getDailyClosingReport, getFullBackup } from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/daily-closing', getDailyClosingReport);
router.get('/backup', restrictTo('owner'), getFullBackup);

export default router;
