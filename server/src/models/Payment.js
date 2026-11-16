import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    loanId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Loan',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Customer',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    mode: {
      type: String,
      enum: ['cash', 'upi'],
      default: 'cash',
    },
    collectedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: 'owner',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ date: -1 });
paymentSchema.index({ customerId: 1, date: -1 });
paymentSchema.index({ loanId: 1, date: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
