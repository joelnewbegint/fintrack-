import express from 'express';
import { z } from 'zod';
import { login, getMe, registerUser, getAgents } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    role: z.enum(['owner', 'agent']).optional(),
    assignedAreas: z.array(z.string()).optional(),
  }),
});

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/register', protect, restrictTo('owner'), validate(registerSchema), registerUser);
router.get('/agents', protect, restrictTo('owner'), getAgents);

export default router;
