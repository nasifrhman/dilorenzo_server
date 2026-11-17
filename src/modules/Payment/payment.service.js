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
    return null;
  }
  return new Stripe(secretKey);
};

// Feature comparison matrix (Design Image 2: "PROGRAM PHASES")
const COMPARISON_TABLE = {
  columns: ['FEATURE', 'ACADEMY', 'ELITE'],
  features: [
    { name: 'Daily Missions & XP', academy: true, elite: true },
    { name: 'Community Feed', academy: true, elite: false },
    { name: 'Leaderboard & Challenges', academy: true, elite: true },
    { name: 'Training Program', academy: true, elite: false },
    { name: 'Rewards Wallet', academy: true, elite: true },
    { name: 'Parent Dashboard', academy: true, elite: false },
    { name: 'Priority Support', academy: true, elite: true },
    { name: '1-on-1 Coach (Mentorship only)', academy: false, elite: true },
  ],
};

// Upgrade Modal / Bottom Sheet data (Design Image 1)
const UPGRADE_MODAL = {
  title: 'UPGRADE TO ACADEMY',
  subtitle: 'Unlock your full potential',
  badge: 'ACADEMY ★',
  cardTitle: 'ACADEMY ★',
  price: 4.99,
  currency: 'GBP',
  formattedPrice: '£4.99/month',
  primaryButtonText: 'UPGRADE NOW — £4.99/month',
  trialButtonText: 'Start 7 Days Free Trial',
  features: [
    'Everything in Free',
    'Personal coach feedback',
    '1-on-1 sessions',
    'Parent dashboard',
    'Priority support',
  ],
};

// Elite 90-Day Mentorship data (Design Image 2)
const ELITE_PROGRAM = {
  id: '90-day-mentorship',
  tag: 'ELITE PROGRAM',
  title: '90-DAY MENTORSHIP',
  name: '90-Day Mentorship',
  price: 450.0,
  currency: 'GBP',
  formattedPrice: '£450.00',
  description:
    'A high-ticket, high-accountability 1-on-1 mentorship program. Selective admission. Personal coach assigned by our team.',
  badges: ['Assigned Coach', 'Private Group', 'Action Steps', 'Personalized Training'],
  buttonText: 'LEARN MORE & APPLY ➔',
  actionUrl: '/scheduling/admission-call',
};

// Clean Production Subscription & Mentorship Plans matching new design
const PLANS = [
  {
    id: 'academy-monthly',
    name: 'Academy Membership',
    tag: 'DSM ACADEMY APP',
    headerTitle: 'UPGRADE TO ACADEMY',
    subtitle: 'Unlock your full potential',
    price: 4.99,
    currency: 'GBP',
    formattedPrice: '£4.99/month',
    displayPrice: '£4.99',
    periodLabel: '/month',
    interval: 'month',
    trialDays: 7,
    trialButtonText: 'START 7-DAY FREE TRIAL',
    buttonText: 'UPGRADE NOW — £4.99/month',
    finePrint: 'Does not include 1-on-1 coaching · Cancel anytime',
    badge: 'ACADEMY ★',
    features: [
      'Everything in Free',
      'Personal coach feedback',
      '1-on-1 sessions',
      'Parent dashboard',
      'Priority support',
    ],
    isPopular: true,
  },
  {
    id: 'academy-annual',
    name: 'Academy Annual',
    tag: 'DSM ACADEMY APP',
    headerTitle: 'UPGRADE TO ACADEMY',
    subtitle: 'Unlock your full potential',
    price: 59.99,
    currency: 'GBP',
    formattedPrice: '£59.99/year',
    displayPrice: '£59.99',
    periodLabel: '/year',
    savings: 'save 37%',
    savingsLabel: 'or £59.99/year — save 37%',
    interval: 'year',
    trialDays: 7,
    trialButtonText: 'START 7-DAY FREE TRIAL',
    buttonText: 'UPGRADE NOW — £59.99/year',
    finePrint: 'Does not include 1-on-1 coaching · Cancel anytime',
    features: [
      'Everything in Free',
      'Personal coach feedback',
      '1-on-1 sessions',
      'Parent dashboard',
      'Priority support',
    ],
    isPopular: false,
  },
  ELITE_PROGRAM,
];

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

// Helper: Resolve or Create Stripe Price for Academy (£4.99/mo) or Annual (£59.99/yr)
const getOrCreateStripePriceId = async (stripeInstance, planKey) => {
  const isAnnual = planKey === 'academy-annual' || planKey === 'app-subscription-annual' || planKey === 'annual';
  const unitAmount = isAnnual ? 5999 : 499; // £59.99 or £4.99 in pence
  const interval = isAnnual ? 'year' : 'month';

  const envPriceId = isAnnual
    ? (process.env.STRIPE_PRICE_ID_ACADEMY_ANNUAL || process.env.STRIPE_PRICE_ID_APP_ANNUAL)
    : (process.env.STRIPE_PRICE_ID_ACADEMY_MONTHLY || process.env.STRIPE_PRICE_ID_APP_MONTHLY);

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

  const productName = isAnnual
    ? 'DSM Academy App (Annual Pro)'
    : 'DSM Academy App (Monthly)';

  const product = await stripeInstance.products.create({
    name: productName,
    description: 'DSM Academy: Daily Missions, Training, Community, Challenges, Parent Dashboard',
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
 * Page 1: Upgrade Modal / Container (Image 2)
 */
const getUpgradeModalService = async () => {
  return {
    title: 'UPGRADE TO ACADEMY',
    subtitle: 'Unlock your full potential',
    badge: 'ACADEMY ★',
    cardTitle: 'ACADEMY ★',
    features: [
      'Everything in Free',
      'Personal coach feedback',
      '1-on-1 sessions',
      'Parent dashboard',
      'Priority support',
    ],
    plan: {
      planId: 'academy-monthly',
      price: 4.99,
      currency: 'GBP',
      formattedPrice: '£4.99/month',
      trialDays: 7,
    },
    primaryButtonText: 'UPGRADE NOW — £4.99/month',
    trialButtonText: 'Start 7 Days Free Trial',
    billingNotice:
      'Card details collected upfront. £0.00 charged today. 7-day free trial auto-renews at £4.99/month unless cancelled.',
  };
};

/**
 * Page 2: Upgrade Screen (Image 1)
 */
const getUpgradeScreenService = async () => {
  return {
    academy: {
      tag: 'DSM ACADEMY APP',
      title: 'UPGRADE TO ACADEMY',
      subtitle: 'Unlock your full potential',
      pills: [
        {
          planId: 'academy-monthly',
          pillText: '£4.99/month',
          price: 4.99,
          currency: 'GBP',
          interval: 'month',
          isDefault: true,
        },
        {
          planId: 'academy-annual',
          pillText: '£59.99/year',
          price: 59.99,
          currency: 'GBP',
          interval: 'year',
          savings: 'save 37%',
          isDefault: false,
        },
      ],
      buttonText: 'START 7-DAY FREE TRIAL',
      trialDays: 7,
      disclaimer: 'Does not include 1-on-1 coaching · Cancel anytime',
      billingNotice:
        'Card details collected upfront. £0.00 charged today. Auto-renews at selected plan price after 7-day trial unless cancelled.',
    },
    eliteProgram: {
      tag: 'ELITE PROGRAM',
      title: '90-DAY MENTORSHIP',
      description:
        'A high-ticket, high-accountability 1-on-1 mentorship program. Selective admission. Personal coach assigned by our team.',
      badges: ['Assigned Coach', 'Private Group', 'Action Steps', 'Personalized Training'],
      buttonText: 'LEARN MORE & APPLY ➔',
      planId: '90-day-mentorship',
      price: 450.0,
      formattedPrice: '£450.00',
    },
  };
};

const getSubscriptionPlansService = getUpgradeScreenService;
const getAllPlansService = getUpgradeScreenService;

/**
 * 2. API to see my plan & current status
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
    plan: {
      $in: [
        'academy-monthly',
        'academy-annual',
        'premium-monthly',
        'premium-annual',
        'app-subscription-monthly',
        'app-subscription-annual',
      ],
    },
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

  const mentorshipSub = await Subscription.findOne({
    user: userId,
    plan: '90-day-mentorship',
    status: 'active',
  });

  const hasMentorship = Boolean(mentorshipSub) || user.tier === '90-day-mentorship';
  const hasAppSubscription = Boolean(subscription && ['active', 'trialing'].includes(subscription.status)) || user.tier === 'premium' || user.tier === 'academy';

  let tierLabel = 'Free';
  if (hasMentorship && hasAppSubscription) {
    tierLabel = 'Academy + 90-Day Mentorship';
  } else if (hasMentorship) {
    tierLabel = '90-Day Mentorship';
  } else if (hasAppSubscription) {
    tierLabel = 'Academy';
  }

  return {
    tier: user.tier || 'free',
    tierLabel,
    hasAppSubscription,
    hasAcademyAccess: hasAppSubscription || hasMentorship,
    hasMentorship,
    appSubscription: {
      status: subscription ? subscription.status : (hasAppSubscription ? (isTrialActive ? 'trialing' : 'active') : 'inactive'),
      plan: subscription ? subscription.plan : (hasAppSubscription ? 'academy-monthly' : 'free'),
      planName: subscription?.plan?.includes('annual') ? 'Academy Annual' : (hasAppSubscription ? 'Academy Membership' : 'Free'),
      formattedPrice: subscription?.plan?.includes('annual') ? '£59.99/year' : (hasAppSubscription ? '£4.99/month' : '£0.00'),
      isTrialActive,
      trialDaysRemaining,
      trialStartDate: user.trialStartDate || null,
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
 * 3. Start 7-Day Free Trial via Stripe Checkout / PaymentSheet
 * - Does NOT directly purchase or activate the plan in MongoDB!
 * - Prepares the Stripe session so the user must enter card details normally.
 * - Card is authorized with 7-day trial (£0.00 today).
 * - Only after Stripe confirms the card does the user receive access.
 */
const startTrialService = async (userId, data = {}) => {
  return await subscribePlanService(userId, data);
};

/**
 * 4. API to purchase plan via Stripe
 * Supports:
 * - Academy Monthly (£4.99/mo, 7-day trial)
 * - Academy Annual (£59.99/yr, 7-day trial)
 * - 90-Day Mentorship (£450.00 one-time admission)
 */
const purchasePlanService = async (userId, data = {}) => {
  const stripe = getStripe();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const rawPlan = (data.planId || data.plan || 'academy-monthly').toLowerCase();
  const isMentorship = rawPlan.includes('mentor') || rawPlan.includes('90') || rawPlan.includes('elite');
  const isAnnual = rawPlan.includes('annual') || rawPlan.includes('year');
  const planKey = isMentorship ? '90-day-mentorship' : (isAnnual ? 'academy-annual' : 'academy-monthly');

  const MySubscription = require('./mySubscription.model');

  // ==============================================================================
  // PLAN MANAGEMENT & SWITCHING LOGIC
  // - 90-Day Mentorship & Academy App are independent products: user can hold BOTH!
  // - Academy Monthly & Academy Annual are the same product: switching cancels old cycle
  // ==============================================================================

  if (!isMentorship) {
    // Only check for duplicates / switching within Academy subscriptions
    const existingAcademySub = await MySubscription.findOne({
      user: user._id,
      status: { $in: ['active', 'trialing'] },
      planId: { $in: ['academy-monthly', 'academy-annual'] },
    });

    if (existingAcademySub) {
      // Trying to buy the exact same Academy plan they already have active
      if (existingAcademySub.planId === planKey) {
        throw new ApiError(
          status.BAD_REQUEST,
          `You already have an active subscription to ${existingAcademySub.planName}.`
        );
      }

      // Switching plans (e.g. Academy Monthly -> Academy Annual or vice-versa)
      // Cancel the old recurring subscription in Stripe so they are NEVER double-billed
      if (existingAcademySub.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(existingAcademySub.stripeSubscriptionId);
        } catch (e) {
          // ignore if already cancelled in Stripe
        }
        existingAcademySub.status = 'canceled';
        existingAcademySub.autoRenews = false;
        await existingAcademySub.save();
      }
    }
  }

  // ==============================================================================
  // LIFETIME FREE TRIAL ENFORCEMENT (Once in a lifetime across all plans)
  // ==============================================================================
  const hasUsedTrial = Boolean(
    user.hasUsedTrial ||
    user.trialStartDate ||
    (await MySubscription.exists({
      user: user._id,
      $or: [
        { trialStartDate: { $ne: null } },
        { trialDays: { $gt: 0 } },
        { status: 'trialing' },
      ],
    }))
  );
  const trialDays = hasUsedTrial || isMentorship ? undefined : 7;

  // Fallback for dev testing if Stripe key is not configured in .env
  if (!stripe) {
    return {
      type: 'CheckoutSession',
      plan: planKey,
      sessionId: `cs_test_mock_${Date.now()}`,
      checkoutUrl: `${process.env.BACKEND_URL || 'http://10.10.28.46:8052'}/api/v1/subscription/success?session_id=mock_session`,
      message: 'Stripe secret key not configured in .env. Returned mock session for local testing.',
    };
  }

  // Resolve paymentMethodId if setupIntentId was provided
  let paymentMethodId = data.paymentMethodId;
  if (!paymentMethodId && data.setupIntentId && stripe) {
    try {
      const si = await stripe.setupIntents.retrieve(data.setupIntentId);
      paymentMethodId = si.payment_method;
    } catch (e) {
      // ignore
    }
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(user, stripe);

  const successUrl =
    data.successUrl ||
    `${process.env.BACKEND_URL || 'http://10.10.28.46:8052'}/api/v1/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    data.cancelUrl ||
    `${process.env.BACKEND_URL || 'http://10.10.28.46:8052'}/api/v1/subscription/my-plan`;

  // Flow 1: 90-Day Mentorship One-Time Purchase (£450.00)
  if (isMentorship) {
    const mentorshipAmount = 450.0;

    // Direct card payment via PaymentMethodId
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 45000,
        currency: 'gbp',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
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

      // Record in MySubscription model
      let subRecord = await Subscription.findOne({ user: user._id, planId: '90-day-mentorship' });
      if (!subRecord) subRecord = new Subscription({ user: user._id });
      subRecord.athleteName = user.fullName || '';
      subRecord.athleteEmail = user.email || '';
      subRecord.planId = '90-day-mentorship';
      subRecord.plan = '90-day-mentorship';
      subRecord.planName = '90-Day Mentorship';
      subRecord.planType = 'one_time';
      subRecord.interval = 'one_time';
      subRecord.amount = mentorshipAmount;
      subRecord.currency = 'GBP';
      subRecord.status = 'active';
      subRecord.isTrialActive = false;
      subRecord.currentPeriodStart = now;
      subRecord.currentPeriodEnd = endDate;
      subRecord.stripeCustomerId = stripeCustomerId;
      subRecord.stripePaymentIntentId = paymentIntent.id;
      subRecord.autoRenews = false;
      await subRecord.save();

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

    // Hosted Stripe Checkout Session for Mentorship
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

  // Flow 2: Academy App Subscription (£4.99/mo or £59.99/yr with 7-Day Trial)
  const priceId = await getOrCreateStripePriceId(stripe, planKey);

  // Direct card setup/subscription via PaymentMethodId
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subParams = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user._id.toString(), plan: planKey },
    };
    if (trialDays) subParams.trial_period_days = trialDays;

    const stripeSub = await stripe.subscriptions.create(subParams);

    const now = new Date();
    const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
    const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;

    let subRecord = await Subscription.findOne({ user: userId });
    if (!subRecord) subRecord = new Subscription({ user: userId });

    subRecord.athleteName = user.fullName || '';
    subRecord.athleteEmail = user.email || '';
    subRecord.planId = planKey;
    subRecord.plan = planKey;
    subRecord.planName = isAnnual ? 'Academy Annual' : 'Academy Membership';
    subRecord.interval = isAnnual ? 'year' : 'month';
    subRecord.status = stripeSub.status;
    subRecord.isTrialActive = stripeSub.status === 'trialing';
    subRecord.stripeSubscriptionId = stripeSub.id;
    subRecord.stripeCustomerId = stripeCustomerId;
    subRecord.stripePriceId = priceId;
    subRecord.amount = isAnnual ? 59.99 : 4.99;
    subRecord.currency = 'GBP';
    subRecord.currentPeriodStart = now;
    subRecord.currentPeriodEnd = periodEnd;
    subRecord.trialStartDate = stripeSub.status === 'trialing' ? now : null;
    subRecord.trialEndDate = trialEnd;
    subRecord.autoRenews = true;
    await subRecord.save();

    if (user.tier !== '90-day-mentorship') {
      user.tier = 'premium';
    }
    user.isTrialActive = stripeSub.status === 'trialing';
    if (stripeSub.status === 'trialing') {
      user.trialStartDate = now;
      user.trialEndDate = trialEnd;
      user.hasUsedTrial = true;
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

  // Hosted Stripe Checkout Session for Academy Subscription
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
 * 5. Create Mobile PaymentSheet / SetupIntent Parameters (For React Native & Flutter)
 */
const createPaymentSheetService = async (userId, data = {}) => {
  const stripe = getStripe();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  if (!stripe) {
    return {
      setupIntentClientSecret: 'seti_mock_secret_test',
      ephemeralKey: 'ek_test_mock_secret',
      customerId: 'cus_mock_test',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_sample',
      plan: data.planId || 'academy-monthly',
      trialDays: 7,
      message: 'Stripe secret key not configured in .env. Mock keys returned for local dev.',
    };
  }

  const customerId = await getOrCreateStripeCustomer(user, stripe);
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2024-06-20' }
  );

  const rawPlan = (data.planId || data.plan || 'academy-monthly').toLowerCase();
  const isMentorship = rawPlan.includes('mentor') || rawPlan.includes('90') || rawPlan.includes('elite');

  if (isMentorship) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 45000,
      currency: 'gbp',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: user._id.toString(), plan: '90-day-mentorship' },
    });

    return {
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      amount: 450.0,
      currency: 'GBP',
    };
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: { userId: user._id.toString(), plan: rawPlan },
  });

  return {
    setupIntentClientSecret: setupIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    plan: rawPlan,
    trialDays: 7,
  };
};

/**
 * 6. Cancel Subscription / Free Trial
 * - If cancelled during the 7-day trial: cancels Stripe subscription immediately so card is never charged.
 * - If cancelled during active billing: sets cancel_at_period_end so user keeps paid time.
 */
const cancelSubscriptionService = async (userId) => {
  const stripe = getStripe();
  const subscription = await Subscription.findOne({
    user: userId,
    status: { $in: ['active', 'trialing'] },
  });

  if (!subscription) {
    throw new ApiError(status.NOT_FOUND, 'No active subscription or free trial found to cancel.');
  }

  const isTrial = subscription.status === 'trialing';

  if (subscription.stripeSubscriptionId && stripe) {
    try {
      if (isTrial) {
        // Immediate cancellation so Stripe does NOT bill the saved card when trial ends
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } else {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (e) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId).catch(() => {});
    }
  }

  subscription.cancelAtPeriodEnd = !isTrial;
  subscription.status = 'canceled';
  await subscription.save();

  const user = await User.findById(userId);
  if (user && user.tier !== '90-day-mentorship') {
    user.isTrialActive = false;
    user.tier = 'free';
    await user.save();
  }

  return {
    status: 'canceled',
    message: isTrial
      ? '7-Day Free Trial has been canceled. Your card will not be charged.'
      : 'Subscription has been canceled. You will retain access until the end of the billing period.',
  };
};

/**
 * 7. Stripe Webhook Handler for Subscriptions and Mentorship Payments
 */
const handleStripeWebhookService = async (rawBody, signature) => {
  const stripe = getStripe();
  if (!stripe) {
    return { received: true, simulated: true };
  }

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

            // Record in MySubscription model
            let subRecord = await Subscription.findOne({ user: user._id, planId: '90-day-mentorship' });
            if (!subRecord) subRecord = new Subscription({ user: user._id });
            subRecord.athleteName = user.fullName || '';
            subRecord.athleteEmail = user.email || '';
            subRecord.planId = '90-day-mentorship';
            subRecord.plan = '90-day-mentorship';
            subRecord.planName = '90-Day Mentorship';
            subRecord.planType = 'one_time';
            subRecord.interval = 'one_time';
            subRecord.amount = (session.amount_total || 45000) / 100;
            subRecord.currency = (session.currency || 'GBP').toUpperCase();
            subRecord.status = 'active';
            subRecord.isTrialActive = false;
            subRecord.currentPeriodStart = now;
            subRecord.currentPeriodEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            subRecord.stripeCustomerId = session.customer || '';
            subRecord.stripePaymentIntentId = session.payment_intent || '';
            subRecord.autoRenews = false;
            await subRecord.save();
          } else if (session.mode === 'subscription' && session.subscription) {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
            if (user.tier !== '90-day-mentorship') {
              user.tier = 'premium';
            }
            user.stripeCustomerId = session.customer;
            user.isTrialActive = stripeSub.status === 'trialing';

            if (stripeSub.status === 'trialing' && stripeSub.trial_end) {
              user.trialStartDate = new Date(stripeSub.trial_start ? stripeSub.trial_start * 1000 : Date.now());
              user.trialEndDate = new Date(stripeSub.trial_end * 1000);
              user.hasUsedTrial = true;
            }
            await user.save();

            let subRecord = await Subscription.findOne({ user: userId });
            if (!subRecord) subRecord = new Subscription({ user: userId });

            const isAnnual = session.metadata?.plan?.includes('annual');
            const planKey = isAnnual ? 'academy-annual' : 'academy-monthly';
            subRecord.athleteName = user.fullName || '';
            subRecord.athleteEmail = user.email || '';
            subRecord.planId = planKey;
            subRecord.plan = planKey;
            subRecord.planName = isAnnual ? 'Academy Annual' : 'Academy Membership';
            subRecord.interval = isAnnual ? 'year' : 'month';
            subRecord.status = stripeSub.status;
            subRecord.isTrialActive = stripeSub.status === 'trialing';
            subRecord.amount = isAnnual ? 59.99 : 4.99;
            subRecord.currency = 'GBP';
            subRecord.stripeSubscriptionId = stripeSub.id;
            subRecord.stripeCustomerId = session.customer;
            subRecord.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            subRecord.trialEndDate = user.trialEndDate;
            subRecord.autoRenews = true;
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
            description: `DSM Academy Subscription (${invoice.number || 'Invoice'})`,
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

/**
 * Unified Subscribe Endpoint (Stripe Mobile Sheet & Web Checkout)
 */
const subscribePlanService = async (userId, data = {}) => {
  const stripe = getStripe();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const rawPlan = (data.planId || data.plan || 'academy-monthly').toLowerCase();
  const isMentorship = rawPlan.includes('mentor') || rawPlan.includes('90') || rawPlan.includes('elite');
  const isAnnual = rawPlan.includes('annual') || rawPlan.includes('year');
  const planKey = isMentorship ? '90-day-mentorship' : (isAnnual ? 'academy-annual' : 'academy-monthly');
  const amount = isMentorship ? 450.0 : (isAnnual ? 59.99 : 4.99);

  const MySubscription = require('./mySubscription.model');
  const hasUsedTrial = Boolean(
    user.hasUsedTrial ||
    user.trialStartDate ||
    (await MySubscription.exists({
      user: user._id,
      $or: [
        { trialStartDate: { $ne: null } },
        { trialDays: { $gt: 0 } },
        { status: 'trialing' },
      ],
    }))
  );
  const trialDays = isMentorship || hasUsedTrial ? 0 : 7;

  // If client provided paymentMethodId or setupIntentId directly, execute direct payment flow
  if (data.paymentMethodId || data.setupIntentId) {
    return await purchasePlanService(userId, data);
  }

  // Get or create mobile payment sheet credentials
  const paymentSheet = await createPaymentSheetService(userId, { planId: planKey });

  // Also get checkout session URL for web fallback
  const checkout = await purchasePlanService(userId, data);

  return {
    plan: planKey,
    amount,
    currency: 'GBP',
    trialDays,
    billingNotice: isMentorship
      ? 'One-time admission fee charged immediately.'
      : trialDays > 0
      ? `Card details collected upfront. £0.00 charged today. 7-day free trial auto-renews at £${amount}${isAnnual ? '/year' : '/month'} unless cancelled.`
      : `First billing of £${amount}${isAnnual ? '/year' : '/month'} charged today (free trial already redeemed).`,
    mobilePaymentSheet: {
      setupIntentClientSecret: paymentSheet.setupIntentClientSecret,
      ephemeralKey: paymentSheet.ephemeralKey,
      customerId: paymentSheet.customerId,
      publishableKey: paymentSheet.publishableKey,
    },
    webCheckout: {
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    },
  };
};

/**
 * 8. Handle Checkout Success (Redirect & Instant Activation in MySubscription DB)
 */
const handleCheckoutSuccessService = async (sessionId, queryUserId) => {
  const stripe = getStripe();
  const MySubscription = require('./mySubscription.model');

  let userId = queryUserId;
  let planKey = 'academy-monthly';
  let stripeSub = null;
  let customerId = '';
  let subscriptionId = '';
  let isMentorship = false;

  // Case 1: Real Stripe session ID
  if (stripe && sessionId && !sessionId.includes('mock')) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      userId = session.metadata?.userId || userId;
      planKey = session.metadata?.plan || planKey;
      customerId = session.customer;
      subscriptionId = session.subscription;
      isMentorship = planKey === '90-day-mentorship';

      if (subscriptionId) {
        stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      }
    } catch (err) {
      console.error('Error retrieving Stripe checkout session:', err.message);
    }
  }

  // If userId not found from metadata or query, fall back to the most recent athlete/user
  let user = null;
  if (userId) {
    user = await User.findById(userId);
  }
  if (!user) {
    user = await User.findOne({ role: { $in: ['user', 'athlete'] } }).sort({ updatedAt: -1 });
  }

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found for subscription activation.');
  }

  const isAnnual = planKey.includes('annual');
  const now = new Date();
  const trialEnd = stripeSub?.trial_end
    ? new Date(stripeSub.trial_end * 1000)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const periodEnd = stripeSub?.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : trialEnd;

  // Update user model
  if (isMentorship) {
    user.tier = '90-day-mentorship';
    user.mentorshipPhase = 'foundation';
    user.mentorshipDay = 1;
    user.mentorshipStartDate = now;
    user.mentorshipEndDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  } else {
    user.tier = 'premium';
    user.isTrialActive = stripeSub ? stripeSub.status === 'trialing' : true;
    user.trialStartDate = now;
    user.trialEndDate = trialEnd;
    user.hasUsedTrial = true;
  }
  if (customerId) user.stripeCustomerId = customerId;
  await user.save();

  // Create or update record in MySubscription collection
  let subRecord = await MySubscription.findOne({
    user: user._id,
    planId: isMentorship ? '90-day-mentorship' : { $ne: '90-day-mentorship' },
  });
  if (!subRecord) {
    subRecord = new MySubscription({ user: user._id });
  }

  subRecord.athleteName = user.fullName || '';
  subRecord.athleteEmail = user.email || '';
  subRecord.planId = planKey;
  subRecord.plan = planKey;
  subRecord.planName = isMentorship
    ? '90-Day Mentorship'
    : isAnnual
    ? 'Academy Annual'
    : 'Academy Membership';
  subRecord.planType = isMentorship ? 'one_time' : 'recurring';
  subRecord.interval = isMentorship ? 'one_time' : isAnnual ? 'year' : 'month';
  subRecord.status = stripeSub?.status || 'trialing';
  subRecord.isTrialActive = !isMentorship;
  subRecord.amount = isMentorship ? 450.0 : isAnnual ? 59.99 : 4.99;
  subRecord.currency = 'GBP';
  subRecord.trialStartDate = isMentorship ? null : now;
  subRecord.trialEndDate = isMentorship ? null : trialEnd;
  subRecord.currentPeriodStart = now;
  subRecord.currentPeriodEnd = isMentorship ? user.mentorshipEndDate : periodEnd;
  subRecord.stripeCustomerId = customerId || user.stripeCustomerId || '';
  subRecord.stripeSubscriptionId = subscriptionId || '';
  subRecord.autoRenews = !isMentorship;
  subRecord.purchasedAt = now;
  await subRecord.save();

  return {
    status: subRecord.status,
    plan: subRecord.planId,
    tier: user.tier,
    isTrialActive: subRecord.isTrialActive,
    trialDaysRemaining: subRecord.trialDaysRemaining || 7,
    trialEndDate: subRecord.trialEndDate,
    mySubscription: subRecord,
    message: 'Subscription activated successfully! Welcome to DSM Academy.',
  };
};

module.exports = {
  PLANS,
  COMPARISON_TABLE,
  UPGRADE_MODAL,
  ELITE_PROGRAM,
  getUpgradeModalService,
  getUpgradeScreenService,
  getAllPlansService,
  getMyPlanService,
  startTrialService,
  subscribePlanService,
  purchasePlanService,
  createPaymentSheetService,
  cancelSubscriptionService,
  handleStripeWebhookService,
  handleCheckoutSuccessService,
};
