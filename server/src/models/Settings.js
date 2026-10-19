import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      default: "VK BANKER'S & FINANCE",
      trim: true,
    },
    businessNameTamil: {
      type: String,
      default: 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்',
      trim: true,
    },
    ownerName: {
      type: String,
      default: 'K. Subramanian',
      trim: true,
    },
    phone: {
      type: String,
      default: '+91 98421 12345',
      trim: true,
    },
    address: {
      type: String,
      default: 'No. 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
      trim: true,
    },
    defaultPenaltyPercent: {
      type: Number,
      default: 2, // 2% per overdue installment
    },
    graceDays: {
      type: Number,
      default: 1, // grace period in days
    },
    defaultLanguage: {
      type: String,
      enum: ['ta', 'en'],
      default: 'ta',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
