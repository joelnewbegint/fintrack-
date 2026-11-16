import mongoose from 'mongoose';

const dailyClosingSchema = new mongoose.Schema(
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
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    totalCollections: {
      type: Number,
      default: 0,
    },
    cashCollections: {
      type: Number,
      default: 0,
    },
    upiCollections: {
      type: Number,
      default: 0,
    },
    totalDisbursed: {
      type: Number,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number,
      default: 0,
    },
    cashInHand: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'closed',
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

dailyClosingSchema.index({ date: -1 });

export const DailyClosing = mongoose.model('DailyClosing', dailyClosingSchema);
export default DailyClosing;

