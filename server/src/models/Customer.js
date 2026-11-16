import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      default: 'owner',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
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
      set: function (v) {
        if (!v) return 'Aadhaar';
        const lower = String(v).toLowerCase();
        if (lower.includes('aadhaar')) return 'Aadhaar';
        if (lower.includes('voter')) return 'Voter ID';
        if (lower.includes('license') || lower.includes('driving')) return 'Driving License';
        if (lower.includes('ration')) return 'Ration Card';
        return v;
      },
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
