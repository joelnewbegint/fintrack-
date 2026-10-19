import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema(
  {
    investorName: {
      type: String,
      required: [true, 'Investor name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Investment capital amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    interestPercent: {
      type: Number,
      default: 0, // 0% for self-capital, or annual % for partner/wholesale borrowing
      min: 0,
    },
    investmentType: {
      type: String,
      enum: ['self', 'partner', 'borrowed'],
      default: 'self',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ['bank', 'cash', 'cheque', 'upi'],
      default: 'bank',
    },
    status: {
      type: String,
      enum: ['active', 'partially_returned', 'closed'],
      default: 'active',
      index: true,
    },
    returns: [
      {
        amount: { type: Number, required: true },
        returnDate: { type: Date, default: Date.now },
        paymentMode: { type: String, enum: ['bank', 'cash', 'cheque', 'upi'], default: 'bank' },
        notes: { type: String, default: '' },
      },
    ],
    totalReturned: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

investmentSchema.virtual('activeCapital').get(function () {
  return Math.max(0, this.amount - (this.totalReturned || 0));
});

investmentSchema.index({ startDate: -1 });

export const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;
