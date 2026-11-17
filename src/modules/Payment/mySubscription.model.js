const mongoose = require('mongoose');

const mySubscriptionSchema = new mongoose.Schema(
  {
    // 1. Who purchased (User Reference)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    athleteEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    athleteName: {
      type: String,
      default: '',
    },

    // 2. Which plan was purchased
    planId: {
      type: String,
      enum: [
        'free',
        'academy-monthly',
        'academy-annual',
        '90-day-mentorship',
        // Legacy aliases
        'premium-monthly',
        'premium-annual',
        'app-subscription-monthly',
        'app-subscription-annual',
      ],
      default: 'academy-monthly',
      index: true,
    },
    // Compatibility alias for planId
    plan: {
      type: String,
      default: 'academy-monthly',
    },
    planName: {
      type: String,
      default: 'Academy Membership',
    },
    planType: {
      type: String,
      enum: ['recurring', 'one_time'],
      default: 'recurring',
    },
    interval: {
      type: String,
      enum: ['month', 'year', 'one_time'],
      default: 'month',
    },
    amount: {
      type: Number,
      required: true,
      default: 4.99,
    },
    currency: {
      type: String,
      default: 'GBP',
      uppercase: true,
    },

    // 3. Subscription & 7-Day Free Trial State
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'expired'],
      default: 'trialing',
      index: true,
    },
    isTrialActive: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 7,
    },
    trialStartDate: {
      type: Date,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },

    // 4. Billing Cycle & Auto-Renewal
    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    nextBillingDate: {
      type: Date,
      default: null,
    },
    autoRenews: {
      type: Boolean,
      default: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: {
      type: Date,
      default: null,
    },

    // 5. Stripe Payment Details
    stripeCustomerId: {
      type: String,
      default: '',
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: '',
      index: true,
    },
    stripePriceId: {
      type: String,
      default: '',
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
    },
    stripeInvoiceId: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      default: 'card',
    },
    cardBrand: {
      type: String,
      default: '',
    },
    cardLast4: {
      type: String,
      default: '',
    },

    // 6. Purchase Metadata
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field: check if trial is currently ongoing
mySubscriptionSchema.virtual('isCurrentlyInTrial').get(function () {
  if (!this.trialEndDate) return false;
  return this.status === 'trialing' && new Date() < new Date(this.trialEndDate);
});

// Virtual field: days remaining in trial
mySubscriptionSchema.virtual('trialDaysRemaining').get(function () {
  if (!this.trialEndDate) return 0;
  const diffMs = new Date(this.trialEndDate).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
});

// Sync plan and planId before saving
mySubscriptionSchema.pre('save', function (next) {
  if (this.planId && !this.plan) {
    this.plan = this.planId;
  } else if (this.plan && !this.planId) {
    this.planId = this.plan;
  }
  next();
});

const MySubscription =
  mongoose.models.MySubscription ||
  mongoose.model('MySubscription', mySubscriptionSchema, 'mysubscriptions');

module.exports = MySubscription;
