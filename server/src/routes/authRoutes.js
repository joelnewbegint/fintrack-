import express from 'express';
import { z } from 'zod';
import { login, getMe, registerUser, getAgents, updateProfile, refreshToken } from '../controllers/authController.js';
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
    address: z.string().optional(),
    role: z.enum(['owner', 'admin', 'agent', 'client']).optional(),
    assignedAreas: z.array(z.string()).optional(),
    customerId: z.string().optional(),
    preferences: z.any().optional(),
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
  // Self-registration defaults to client role
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
router.get('/agents', protect, restrictTo('owner', 'admin'), getAgents);

export default router;
