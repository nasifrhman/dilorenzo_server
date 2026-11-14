const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium-monthly', 'premium-annual', '90-day-mentorship'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'],
      default: 'active',
    },
    stripeSubscriptionId: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '' },
    stripePriceId: { type: String, default: '' },
    amount: { type: Number, default: 4.99 },
    currency: { type: String, default: 'GBP' },
    trialStartDate: { type: Date, default: null },
    trialEndDate: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
