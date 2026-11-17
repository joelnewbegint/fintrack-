import mongoose from 'mongoose';

const emiInstallmentSchema = new mongoose.Schema({
  installmentNo: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  principalPart: {
    type: Number,
    default: 0,
  },
  interestPart: {
    type: Number,
    default: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  penaltyAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue', 'rescheduled'],
    default: 'pending',
    index: true,
  },
  paidDate: {
    type: Date,
    default: null,
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'cheque', ''],
    default: '',
  },
  receiptNo: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
});

const emiLoanSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    emiNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    customerArea: {
      type: String,
      trim: true,
      default: '',
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    assignedAgentName: {
      type: String,
      default: '',
    },
    principal: {
      type: Number,
      required: true,
      min: 500,
    },
    interestRatePercent: {
      type: Number,
      required: true,
      min: 0,
    },
    interestCalculationType: {
      type: String,
      enum: ['reducing', 'flat'],
      default: 'reducing',
    },
    tenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    documentationCharges: {
      type: Number,
      default: 0,
    },
    installmentAmount: {
      type: Number,
      required: true,
    },
    totalPayable: {
      type: Number,
      required: true,
    },
    totalInterest: {
      type: Number,
      default: 0,
    },
    totalCollected: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
    },
    totalPenalties: {
      type: Number,
      default: 0,
    },
    penaltiesCollected: {
      type: Number,
      default: 0,
    },
    latePenaltyPerDay: {
      type: Number,
      default: 50,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'foreclosed', 'defaulted'],
      default: 'active',
      index: true,
    },
    schedule: [emiInstallmentSchema],
    reschedules: [
      {
        installmentNo: Number,
        oldDueDate: Date,
        newDueDate: Date,
        reason: String,
        date: { type: Date, default: Date.now },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    foreclosure: {
      isForeclosed: { type: Boolean, default: false },
      quoteAmount: { type: Number, default: 0 },
      discountGiven: { type: Number, default: 0 },
      foreclosureDate: { type: Date, default: null },
      notes: { type: String, default: '' },
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emiLoanSchema.index({ assignedAgentId: 1, status: 1 });
emiLoanSchema.index({ customerId: 1, status: 1 });
emiLoanSchema.index({ 'schedule.dueDate': 1, 'schedule.status': 1 });

export const EMILoan = mongoose.model('EMILoan', emiLoanSchema);
export default EMILoan;

