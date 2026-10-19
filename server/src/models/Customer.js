import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
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
    idProofUrl: {
      type: String,
      default: '',
    },
    idProofType: {
      type: String,
      enum: ['Aadhaar', 'Voter ID', 'Driving License', 'Ration Card', 'Other'],
      default: 'Aadhaar',
    },
    idProofNumber: {
      type: String,
      trim: true,
      default: '',
    },
    guarantor: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ name: 'text', phone: 'text', area: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
