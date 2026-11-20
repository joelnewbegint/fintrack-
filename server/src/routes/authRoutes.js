import express from 'express';
import { z } from 'zod';
import {
  login,
  getMe,
  registerUser,
  getAgents,
  createAgent,
  updateAgent,
  toggleAgentStatus,
  resetAgentPassword,
  deleteAgent,
  updateProfile,
  refreshToken,
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    username: z.string().optional(),
    loginId: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    username: z.string().optional(),
    email: z.string().email('Valid email required'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
    phone: z.string().optional(),
    address: z.string().optional(),
    role: z.enum(['owner', 'admin', 'loan_agent', 'agent', 'emi_agent', 'client']).optional(),
    assignedAreas: z.array(z.string()).optional(),
    customerId: z.string().optional(),
    preferences: z.any().optional(),
  }),
});

const agentCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Agent name is required'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
    role: z.enum(['loan_agent', 'emi_agent']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    assignedAreas: z.array(z.string()).optional(),
  }),
});

const allowClientOrOwner = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => {
      if (req.user?.role === 'owner' || req.user?.role === 'admin') return next();
      if (req.body.role === 'client') return next();
      return res.status(403).json({ success: false, message: 'Only owners or admins can create agent/owner accounts' });
    });
  }
  if (!req.body.role || req.body.role === 'client') {
    req.body.role = 'client';
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required to create non-client accounts' });
};

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.post('/register', allowClientOrOwner, validate(registerSchema), registerUser);

// Owner-only Agent Management Routes
router.get('/agents', protect, restrictTo('owner'), getAgents);
router.post('/agents', protect, restrictTo('owner'), validate(agentCreateSchema), createAgent);
router.put('/agents/:id', protect, restrictTo('owner'), updateAgent);
router.patch('/agents/:id/status', protect, restrictTo('owner'), toggleAgentStatus);
router.post('/agents/:id/reset-password', protect, restrictTo('owner'), resetAgentPassword);
router.delete('/agents/:id', protect, restrictTo('owner'), deleteAgent);

export default router;
