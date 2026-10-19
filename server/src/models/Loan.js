import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
  installmentNo: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue'],
    default: 'pending',
  },
  paidDate: {
    type: Date,
    default: null,
  },
});

const loanSchema = new mongoose.Schema(
  {
    loanNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    principal: {
      type: Number,
      required: true,
      min: 100,
    },
    interestPercent: {
      type: Number,
      required: true,
      min: 0,
    },
    financeType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    installmentAmount: {
      type: Number,
      required: true,
    },
    totalPayable: {
      type: Number,
      required: true,
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
      enum: ['active', 'completed', 'overdue', 'defaulted'],
      default: 'active',
      index: true,
    },
    latePenaltyRate: {
      type: Number,
      default: 0, // penalty percentage or daily flat fee
    },
    totalPenalties: {
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
    schedule: [installmentSchema],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-speed dashboard and reporting queries
loanSchema.index({ status: 1, financeType: 1 });
loanSchema.index({ customerId: 1, status: 1 });
loanSchema.index({ 'schedule.dueDate': 1, 'schedule.status': 1 });

export const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
