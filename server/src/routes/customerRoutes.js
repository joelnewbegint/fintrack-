import express from 'express';
import { z } from 'zod';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const customerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name is required'),
    phone: z.string().min(10, 'Valid 10-digit phone number is required'),
    address: z.string().min(3, 'Address is required'),
    area: z.string().min(2, 'Area is required'),
    photoUrl: z.string().optional(),
    idProofUrl: z.string().optional(),
    idProofType: z.string().optional(),
    idProofNumber: z.string().optional(),
    guarantor: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        relationship: z.string().optional(),
      })
      .optional(),
    notes: z.string().optional(),
  }),
});

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validate(customerSchema), createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', restrictTo('owner'), deleteCustomer);

export default router;
