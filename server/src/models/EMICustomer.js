import mongoose from 'mongoose';

const emiCustomerSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    tamilName: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    altPhone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area / Location is required'],
      trim: true,
      index: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    idProofType: {
      type: String,
      default: 'Aadhaar Card',
    },
    idProofNumber: {
      type: String,
      trim: true,
      default: '',
    },
    idProofUrl: {
      type: String,
      default: '',
    },
    guarantor: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      relationship: { type: String, default: '' },
      idProof: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

emiCustomerSchema.index({ name: 'text', phone: 'text', area: 'text' });

export const EMICustomer = mongoose.model('EMICustomer', emiCustomerSchema);
export default EMICustomer;

