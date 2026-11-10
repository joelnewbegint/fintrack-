import express from 'express';
import { getSettings, updateSettings, getAuditLogs, clearAllData } from '../controllers/settingsController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', restrictTo('owner'), updateSettings);
router.get('/audit-logs', restrictTo('owner'), getAuditLogs);
router.post('/clear-all-data', restrictTo('owner'), clearAllData);

export default router;
