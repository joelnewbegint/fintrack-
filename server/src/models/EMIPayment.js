import mongoose from 'mongoose';

const emiPaymentSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    emiLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMILoan',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMICustomer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    installmentNos: {
      type: [Number],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    principalPortion: {
      type: Number,
      default: 0,
    },
    interestPortion: {
      type: Number,
      default: 0,
    },
    penaltyPortion: {
      type: Number,
      default: 0,
    },
    discountPortion: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    mode: {
      type: String,
      enum: ['cash', 'upi', 'cheque'],
      default: 'cash',
    },
    referenceNo: {
      type: String,
      trim: true,
      default: '',
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collectedByName: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['valid', 'reversed'],
      default: 'valid',
      index: true,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reversalReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emiPaymentSchema.index({ paymentDate: 1, collectedBy: 1 });
emiPaymentSchema.index({ emiLoanId: 1, paymentDate: -1 });

export const EMIPayment = mongoose.model('EMIPayment', emiPaymentSchema);
export default EMIPayment;

