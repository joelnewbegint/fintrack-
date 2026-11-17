import mongoose from 'mongoose';

const emiDailyClosingSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    agentName: {
      type: String,
      default: 'All / Office',
    },
    openingCash: {
      type: Number,
      default: 0,
    },
    totalCollectedCash: {
      type: Number,
      default: 0,
    },
    totalCollectedUpi: {
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
    closingCash: {
      type: Number,
      default: 0,
    },
    expectedCash: {
      type: Number,
      default: 0,
    },
    difference: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'verified'],
      default: 'closed',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

emiDailyClosingSchema.index({ date: 1, agentId: 1 }, { unique: true });

export const EMIDailyClosing = mongoose.model('EMIDailyClosing', emiDailyClosingSchema);
export default EMIDailyClosing;

