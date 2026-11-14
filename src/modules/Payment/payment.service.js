const Stripe = require('stripe');
const { status } = require('http-status');
const ApiError = require('../../helpers/ApiError');
const User = require('../User/user.model');
const Subscription = require('./subscription.model');
const Payment = require('./payment.model');

// Helper to initialize Stripe
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

// All Available Plans matching the design (Figma Upgrade screen)
const PLANS = {
  appSubscription: {
    category: 'DSM ACADEMY APP',
    title: 'APP SUBSCRIPTION',
    subtitle: 'Gamification · Training content · Challenges · Leaderboards',
    footnote: 'Does not include 1-on-1 coaching · Cancel anytime',
    monthly: {
      id: 'app-subscription-monthly',
      name: 'Monthly App Subscription',
      price: 7.99,
      currency: 'GBP',
      currencySymbol: '£',
      interval: 'month',
      trialDays: 7,
      buttonText: 'START 7-DAY FREE TRIAL',
      formattedPrice: '£7.99/month',
    },
    annual: {
      id: 'app-subscription-annual',
      name: 'Annual App Subscription',
      price: 59.99,
      currency: 'GBP',
      currencySymbol: '£',
      interval: 'year',
      trialDays: 7,
      discountText: 'save 37%',
      formattedPrice: '£59.99/year — save 37%',
    },
    featuresComparison: [
      { feature: 'Daily Missions & XP', free: true, pro: true },
      { feature: 'Community Feed', free: true, pro: true },
      { feature: 'Leaderboard & Challenges', free: true, pro: true },
      { feature: 'Training Program', free: false, pro: true },
      { feature: 'Rewards Wallet', free: false, pro: true },
      { feature: 'Parent Dashboard', free: false, pro: true },
      { feature: 'Priority Support', free: false, pro: true },
      { feature: '1-on-1 Coach (Mentorship only)', free: false, pro: false },
    ],
  },
  mentorship: {
    category: 'ELITE PROGRAM',
    title: '90-DAY MENTORSHIP',
    subtitle:
      'A high-ticket, high-accountability 1-on-1 mentorship program. Selective admission. Personal coach assigned by our team.',
    id: '90-day-mentorship',
    name: '90-Day Mentorship Elite Program',
    price: 450.0,
    currency: 'GBP',
    currencySymbol: '£',
    type: 'one-time',
    buttonText: 'LEARN MORE & APPLY →',
    formattedPrice: '£450.00 one-off',
    pills: [
      'Assigned Coach',
      'Private Group',
      'Action Steps',
      'Personalized Training',
    ],
    features: [
      'Dedicated 1-on-1 High-Performance Mindset Coach',
      'Private 3-Way Group (Athlete, Coach, Parent)',
      '90-Day Step-by-Step Curriculum Roadmap (Days 1–90)',
      'Personalized Action Steps & Habit Auditing',
      'Match Mentality Audits & 1-on-1 Video Calls',
      'Full App Subscription Pro Access Included',
    ],
  },
};

// Helper: Find or create Stripe Customer
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
    phone: user.phoneNumber || undefined,
    metadata: { userId: user._id.toString() },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

// Helper: Resolve or Create Stripe Price for Monthly (£7.99/mo) or Annual (£59.99/yr)
const getOrCreateStripePriceId = async (stripeInstance, planKey) => {
  const isAnnual = planKey === 'app-subscription-annual' || planKey === 'annual';
  const unitAmount = isAnnual ? 5999 : 799; // £59.99 or £7.99 in pence
  const interval = isAnnual ? 'year' : 'month';
  const envPriceId = isAnnual
    ? process.env.STRIPE_PRICE_ID_APP_ANNUAL
    : process.env.STRIPE_PRICE_ID_APP_MONTHLY;

  if (envPriceId) return envPriceId;

  // Search existing prices in Stripe
  const prices = await stripeInstance.prices.list({
    active: true,
    currency: 'gbp',
    type: 'recurring',
    limit: 20,
  });

  const existing = prices.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency.toLowerCase() === 'gbp' &&
      p.recurring?.interval === interval
  );

  if (existing) return existing.id;

  const product = await stripeInstance.products.create({
    name: isAnnual ? 'DSM Academy App (Annual Pro)' : 'DSM Academy App (Monthly Pro)',
    description: 'Gamification · Training content · Challenges · Leaderboards · Parent Dashboard',
  });

  const price = await stripeInstance.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'gbp',
    recurring: { interval },
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
    'fullName email tier trialStartDate trialEndDate isTrialActive mentorshipPhase mentorshipDay mentorshipStartDate mentorshipEndDate stripeCustomerId'
  );
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const subscription = await Subscription.findOne({
    user: userId,
    plan: { $in: ['premium-monthly', 'premium-annual', 'app-subscription-monthly', 'app-subscription-annual'] },
  }).sort({ createdAt: -1 });

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

  const hasMentorship = user.tier === '90-day-mentorship';
  const hasAppSubscription = user.tier === 'premium' || hasMentorship;

  return {
    tier: user.tier || 'free',
    hasAppSubscription,
    hasMentorship,
    appSubscription: {
      status: subscription ? subscription.status : (hasAppSubscription ? 'active' : 'inactive'),
      plan: subscription ? subscription.plan : (hasAppSubscription ? 'app-subscription-monthly' : 'free'),
      isTrialActive,
      trialDaysRemaining,
      trialEndDate: user.trialEndDate || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
    },
    mentorship: hasMentorship
      ? {
          status: 'active',
          phase: user.mentorshipPhase || 'foundation',
          currentDay: user.mentorshipDay || 1,
          startDate: user.mentorshipStartDate || null,
          endDate: user.mentorshipEndDate || null,
        }
      : null,
  };
};

/**
 * 3. API to purchase plan via Stripe
 * Supports:
 * - App Subscription Monthly (£7.99/mo, 7-day trial)
 * - App Subscription Annual (£59.99/yr, 7-day trial)
 * - 90-Day Mentorship (£450.00 one-time admission)
 */
const purchasePlanService = async (userId, data = {}) => {
  const stripe = getStripe();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const planId = (data.planId || data.plan || 'app-subscription-monthly').toLowerCase();
  const stripeCustomerId = await getOrCreateStripeCustomer(user, stripe);

  const successUrl =
    data.successUrl ||
    `${process.env.BACKEND_URL || 'http://localhost:8052'}/api/v1/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    data.cancelUrl ||
    `${process.env.BACKEND_URL || 'http://localhost:8052'}/api/v1/subscription/my-plan`;

  // ==========================================
  // Flow 1: 90-DAY MENTORSHIP ONE-TIME PURCHASE (£450.00)
  // ==========================================
  if (
    planId === '90-day-mentorship' ||
    planId === 'mentorship' ||
    planId === 'elite'
  ) {
    const mentorshipAmount = 450.0;

    // Mobile direct payment with paymentMethodId
    if (data.paymentMethodId) {
      await stripe.paymentMethods.attach(data.paymentMethodId, { customer: stripeCustomerId });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 45000, // £450.00 in pence
        currency: 'gbp',
        customer: stripeCustomerId,
        payment_method: data.paymentMethodId,
        off_session: true,
        confirm: true,
        description: '90-Day Mentorship Elite Admission',
        metadata: { userId: user._id.toString(), plan: '90-day-mentorship' },
      });

      const now = new Date();
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      user.tier = '90-day-mentorship';
      user.mentorshipPhase = 'foundation';
      user.mentorshipDay = 1;
      user.mentorshipStartDate = now;
      user.mentorshipEndDate = endDate;
      await user.save();

      await Payment.create({
        athlete: user._id,
        description: '90-Day Mentorship Elite Admission',
        amount: mentorshipAmount,
        currency: 'GBP',
        status: 'paid',
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId,
        paymentMethod: 'card',
        paidAt: now,
      });

      return {
        type: 'MentorshipPurchased',
        tier: user.tier,
        mentorshipPhase: user.mentorshipPhase,
        mentorshipDay: user.mentorshipDay,
        mentorshipStartDate: user.mentorshipStartDate,
        mentorshipEndDate: user.mentorshipEndDate,
        message: 'Successfully enrolled in the 90-Day Mentorship program!',
      };
    }

    // Hosted Stripe Checkout Session for 90-Day Mentorship
    const lineItem = process.env.STRIPE_PRICE_ID_MENTORSHIP
      ? { price: process.env.STRIPE_PRICE_ID_MENTORSHIP, quantity: 1 }
      : {
          price_data: {
            currency: 'gbp',
            unit_amount: 45000,
            product_data: {
              name: '90-Day Mentorship Elite Program',
              description:
                '1-on-1 High Performance Mindset Coaching, Private Group, and 90-Day Roadmap',
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user._id.toString(), plan: '90-day-mentorship' },
    });

    return {
      type: 'CheckoutSession',
      plan: '90-day-mentorship',
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  // ==========================================
  // Flow 2: APP SUBSCRIPTION (Monthly £7.99 / Annual £59.99 with 7-Day Trial)
  // ==========================================
  const isAnnual = planId === 'app-subscription-annual' || planId === 'annual';
  const priceId = await getOrCreateStripePriceId(stripe, planId);
  const hasUsedTrial = Boolean(user.trialEndDate);
  const trialDays = hasUsedTrial ? undefined : 7;
  const planKey = isAnnual ? 'app-subscription-annual' : 'app-subscription-monthly';

  // Mobile direct card purchase
  if (data.paymentMethodId) {
    await stripe.paymentMethods.attach(data.paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: data.paymentMethodId },
    });

    const subParams = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: data.paymentMethodId,
      metadata: { userId: user._id.toString(), plan: planKey },
    };
    if (trialDays) subParams.trial_period_days = trialDays;

    const stripeSub = await stripe.subscriptions.create(subParams);

    const now = new Date();
    const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
    const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;

    let subRecord = await Subscription.findOne({ user: userId });
    if (!subRecord) subRecord = new Subscription({ user: userId });

    subRecord.plan = isAnnual ? 'premium-annual' : 'premium-monthly';
    subRecord.status = stripeSub.status;
    subRecord.stripeSubscriptionId = stripeSub.id;
    subRecord.stripeCustomerId = stripeCustomerId;
    subRecord.stripePriceId = priceId;
    subRecord.amount = isAnnual ? 59.99 : 7.99;
    subRecord.currency = 'GBP';
    subRecord.currentPeriodEnd = periodEnd;
    subRecord.trialEndDate = trialEnd;
    await subRecord.save();

    if (user.tier !== '90-day-mentorship') {
      user.tier = 'premium';
    }
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
      plan: planKey,
      tier: user.tier,
      isTrialActive: user.isTrialActive,
      trialEndDate: user.trialEndDate,
      currentPeriodEnd: periodEnd,
    };
  }

  // Hosted Stripe Checkout Session for App Subscription
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { userId: user._id.toString(), plan: planKey },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: user._id.toString(), plan: planKey },
  });

  return {
    type: 'CheckoutSession',
    plan: planKey,
    sessionId: session.id,
    checkoutUrl: session.url,
  };
};

/**
 * Stripe Webhook Handler for both Subscriptions and Mentorship Payments
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
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          // If 90-Day Mentorship one-time payment
          if (plan === '90-day-mentorship') {
            const now = new Date();
            user.tier = '90-day-mentorship';
            user.mentorshipPhase = 'foundation';
            user.mentorshipDay = 1;
            user.mentorshipStartDate = now;
            user.mentorshipEndDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            await user.save();

            await Payment.create({
              athlete: user._id,
              description: '90-Day Mentorship Admission',
              amount: (session.amount_total || 45000) / 100,
              currency: (session.currency || 'GBP').toUpperCase(),
              status: 'paid',
              stripePaymentIntentId: session.payment_intent || '',
              stripeCustomerId: session.customer || '',
              paymentMethod: 'card',
              paidAt: now,
            });
          }
          // If App Subscription recurring
          else if (session.mode === 'subscription' && session.subscription) {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
            if (user.tier !== '90-day-mentorship') {
              user.tier = 'premium';
            }
            user.stripeCustomerId = session.customer;
            user.isTrialActive = stripeSub.status === 'trialing';

            if (stripeSub.status === 'trialing' && stripeSub.trial_end) {
              user.trialStartDate = new Date(stripeSub.trial_start ? stripeSub.trial_start * 1000 : Date.now());
              user.trialEndDate = new Date(stripeSub.trial_end * 1000);
            }
            await user.save();

            let subRecord = await Subscription.findOne({ user: userId });
            if (!subRecord) subRecord = new Subscription({ user: userId });

            subRecord.plan = session.metadata?.plan?.includes('annual')
              ? 'premium-annual'
              : 'premium-monthly';
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
          if (user.tier !== '90-day-mentorship') {
            user.tier = 'premium';
          }
          user.isTrialActive = stripeSub.status === 'trialing';
        } else if (['canceled', 'unpaid'].includes(stripeSub.status)) {
          if (user.tier !== '90-day-mentorship') {
            user.tier = 'free';
          }
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
        if (user && user.tier !== '90-day-mentorship') {
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
            description: `App Subscription (${invoice.number || 'Invoice'})`,
            amount: (invoice.amount_paid || 799) / 100,
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
  PLANS,
  getAllPlansService,
  getMyPlanService,
  purchasePlanService,
  handleStripeWebhookService,
};
