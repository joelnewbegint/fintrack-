import express from 'express';
import {
  getStatus,
  generateCode,
  logoutSession,
  reconnectSession,
  sendReminder,
} from '../controllers/whatsappController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/status', getStatus);
router.post('/generate-code', restrictTo('owner'), generateCode);
router.post('/logout', restrictTo('owner'), logoutSession);
router.post('/reconnect', restrictTo('owner'), reconnectSession);
router.post('/send-reminder', sendReminder);

export default router;
