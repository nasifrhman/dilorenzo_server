const Stripe = require('stripe');
const { status } = require('http-status');
const ApiError = require('../../helpers/ApiError');
const User = require('../User/user.model');
const Subscription = require('./subscription.model');
const Payment = require('./payment.model');

// Initialize Stripe instance
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(
      status.SERVICE_UNAVAILABLE,
      'Stripe secret key is not configured. Please set STRIPE_SECRET_KEY in .env'
    );
  }
  return new Stripe(secretKey);
};

// All Available Subscription Plans
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'GBP',
    interval: 'free',
    features: [
      'Basic daily tasks',
      'Community feed',
      'Leaderboards',
    ],
  },
  {
    id: 'academy-monthly',
    name: 'Academy',
    price: 4.99,
    currency: 'GBP',
    interval: 'month',
    trialDays: 7,
    features: [
      'Everything in Free',
      'Personal coach feedback',
      '1-on-1 sessions',
      'Parent dashboard',
      'Priority support',
    ],
  },
];

// Helper: Get or create Stripe Customer
const getOrCreateStripeCustomer = async (user, stripeInstance) => {
  if (user.stripeCustomerId) {
    try {
      const existing = await stripeInstance.customers.retrieve(user.stripeCustomerId);
      if (existing && !existing.deleted) {
        return existing.id;
      }
    } catch (e) {
      // Re-create if retrieval fails
    }
  }

  const customer = await stripeInstance.customers.create({
    email: user.email,
    name: user.fullName,
    metadata: { userId: user._id.toString() },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

// Helper: Get or create Stripe Price for £4.99/mo
const getOrCreateAcademyPriceId = async (stripeInstance) => {
  if (process.env.STRIPE_PRICE_ID_ACADEMY_MONTHLY) {
    return process.env.STRIPE_PRICE_ID_ACADEMY_MONTHLY;
  }

  const prices = await stripeInstance.prices.list({
    active: true,
    currency: 'gbp',
    type: 'recurring',
    limit: 20,
  });

  const existingPrice = prices.data.find(
    (p) =>
      p.unit_amount === 499 &&
      p.currency.toLowerCase() === 'gbp' &&
      p.recurring?.interval === 'month'
  );

  if (existingPrice) return existingPrice.id;

  const product = await stripeInstance.products.create({
    name: 'Academy Membership',
    description: 'Unlock your full potential - Di Lorenzo Mindset Academy',
  });

  const price = await stripeInstance.prices.create({
    product: product.id,
    unit_amount: 499,
    currency: 'gbp',
    recurring: { interval: 'month' },
  });

  return price.id;
};

/**
 * 1. API to see all plans
 */
const getAllPlansService = async () => {
  return PLANS;
};

/**
 * 2. API to see my plan
 */
const getMyPlanService = async (userId) => {
  const user = await User.findById(userId).select(
    'fullName email tier trialStartDate trialEndDate isTrialActive stripeCustomerId'
  );
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const subscription = await Subscription.findOne({ user: userId }).sort({ createdAt: -1 });

  const now = new Date();
  let isTrialActive = Boolean(user.isTrialActive);
  let trialDaysRemaining = 0;

  if (user.trialEndDate) {
    const diffMs = new Date(user.trialEndDate).getTime() - now.getTime();
    if (diffMs > 0) {
      trialDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isTrialActive = true;
    } else {
      isTrialActive = false;
      if (user.isTrialActive) {
        user.isTrialActive = false;
        await user.save();
      }
    }
  }

  const currentPlan =
    user.tier === '90-day-mentorship'
      ? '90-day-mentorship'
      : user.tier === 'premium'
      ? 'academy-monthly'
      : 'free';

  return {
    currentPlan,
    tier: user.tier || 'free',
    status: subscription ? subscription.status : (user.tier === 'free' ? 'active' : 'active'),
    isTrialActive,
    trialDaysRemaining,
    trialEndDate: user.trialEndDate || null,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
  };
};

/**
 * 3. API to purchase plan
 * Supports both:
 * - In-app mobile payment (with paymentMethodId)
 * - Stripe Checkout URL (for web/webview)
 */
const purchasePlanService = async (userId, data = {}) => {
  const stripe = getStripe();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(user, stripe);
  const priceId = await getOrCreateAcademyPriceId(stripe);
  const hasUsedTrial = Boolean(user.trialEndDate);
  const trialDays = hasUsedTrial ? undefined : 7;

  // Case A: Mobile direct purchase with paymentMethodId
  if (data.paymentMethodId) {
    await stripe.paymentMethods.attach(data.paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: data.paymentMethodId },
    });

    const subParams = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: data.paymentMethodId,
      metadata: { userId: user._id.toString(), plan: 'academy-monthly' },
    };
    if (trialDays) subParams.trial_period_days = trialDays;

    const stripeSub = await stripe.subscriptions.create(subParams);

    const now = new Date();
    const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
    const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;

    let subRecord = await Subscription.findOne({ user: userId });
    if (!subRecord) subRecord = new Subscription({ user: userId });

    subRecord.plan = 'premium-monthly';
    subRecord.status = stripeSub.status;
    subRecord.stripeSubscriptionId = stripeSub.id;
    subRecord.stripeCustomerId = stripeCustomerId;
    subRecord.stripePriceId = priceId;
    subRecord.amount = 4.99;
    subRecord.currency = 'GBP';
    subRecord.currentPeriodEnd = periodEnd;
    subRecord.trialEndDate = trialEnd;
    await subRecord.save();

    user.tier = 'premium';
    user.isTrialActive = stripeSub.status === 'trialing';
    if (stripeSub.status === 'trialing') {
      user.trialStartDate = now;
      user.trialEndDate = trialEnd;
    }
    await user.save();

    return {
      type: 'DirectSubscription',
      subscriptionId: stripeSub.id,
      status: stripeSub.status,
      plan: 'academy-monthly',
      tier: user.tier,
      isTrialActive: user.isTrialActive,
      trialEndDate: user.trialEndDate,
      currentPeriodEnd: periodEnd,
    };
  }

  // Case B: Hosted Stripe Checkout Session (Web / WebView)
  const successUrl =
    data.successUrl ||
    `${process.env.BACKEND_URL || 'http://localhost:8052'}/api/v1/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    data.cancelUrl ||
    `${process.env.BACKEND_URL || 'http://localhost:8052'}/api/v1/subscription/my-plan`;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { userId: user._id.toString(), plan: 'academy-monthly' },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: user._id.toString(), plan: 'academy-monthly' },
  });

  return {
    type: 'CheckoutSession',
    sessionId: session.id,
    checkoutUrl: session.url,
  };
};

/**
 * Webhook handler for asynchronous Stripe events
 */
const handleStripeWebhookService = async (rawBody, signature) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new ApiError(status.BAD_REQUEST, `Webhook Signature Verification Failed: ${err.message}`);
    }
  } else {
    event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  }

  const dataObject = event.data?.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = dataObject;
      if (session.mode === 'subscription' && session.subscription) {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        const userId = session.metadata?.userId || stripeSub.metadata?.userId;
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            user.stripeCustomerId = session.customer;
            user.tier = 'premium';
            user.isTrialActive = stripeSub.status === 'trialing';
            if (stripeSub.status === 'trialing' && stripeSub.trial_end) {
              user.trialStartDate = new Date(stripeSub.trial_start ? stripeSub.trial_start * 1000 : Date.now());
              user.trialEndDate = new Date(stripeSub.trial_end * 1000);
            }
            await user.save();

            let subRecord = await Subscription.findOne({ user: userId });
            if (!subRecord) subRecord = new Subscription({ user: userId });
            subRecord.plan = 'premium-monthly';
            subRecord.status = stripeSub.status;
            subRecord.stripeSubscriptionId = stripeSub.id;
            subRecord.stripeCustomerId = session.customer;
            subRecord.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            subRecord.trialEndDate = user.trialEndDate;
            await subRecord.save();
          }
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSub = dataObject;
      const user = await User.findOne({
        $or: [
          { stripeCustomerId: stripeSub.customer },
          ...(stripeSub.metadata?.userId ? [{ _id: stripeSub.metadata.userId }] : []),
        ],
      });

      if (user) {
        if (['active', 'trialing'].includes(stripeSub.status)) {
          user.tier = 'premium';
          user.isTrialActive = stripeSub.status === 'trialing';
        } else if (['canceled', 'unpaid'].includes(stripeSub.status)) {
          user.tier = 'free';
          user.isTrialActive = false;
        }
        await user.save();

        let subRecord = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
        if (subRecord) {
          subRecord.status = stripeSub.status;
          subRecord.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
          await subRecord.save();
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSub = dataObject;
      const subRecord = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
      if (subRecord) {
        subRecord.status = 'canceled';
        await subRecord.save();
        const user = await User.findById(subRecord.user);
        if (user) {
          user.tier = 'free';
          user.isTrialActive = false;
          await user.save();
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = dataObject;
      if (invoice.subscription) {
        const subRecord = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
        if (subRecord) {
          await Payment.create({
            athlete: subRecord.user,
            description: 'Academy Subscription',
            amount: (invoice.amount_paid || 499) / 100,
            currency: (invoice.currency || 'GBP').toUpperCase(),
            status: 'paid',
            stripeInvoiceId: invoice.id,
            paidAt: new Date(),
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return { received: true };
};

module.exports = {
  getAllPlansService,
  getMyPlanService,
  purchasePlanService,
  handleStripeWebhookService,
};
