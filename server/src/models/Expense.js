import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'tea_refreshment',
        'travel_fuel',
        'rent',
        'salary',
        'stationery',
        'electricity_internet',
        'maintenance',
        'miscellaneous',
      ],
      default: 'miscellaneous',
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
      enum: ['cash', 'upi', 'bank'],
      default: 'cash',
    },
    paidTo: {
      type: String,
      default: '',
      trim: true,
    },
    receiptNo: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
