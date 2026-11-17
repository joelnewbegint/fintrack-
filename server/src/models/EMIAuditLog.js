import mongoose from 'mongoose';

const emiAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    emiLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMILoan',
      default: null,
      index: true,
    },
    receiptNo: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const EMIAuditLog = mongoose.model('EMIAuditLog', emiAuditLogSchema);
export default EMIAuditLog;

