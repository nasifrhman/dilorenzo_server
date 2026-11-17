const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
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
} = require('./payment.service');

// Page 1: Upgrade Modal / Container Controller (Image 2)
const getUpgradeModalController = catchAsync(async (req, res) => {
  const result = await getUpgradeModalService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Upgrade modal data retrieved successfully',
      type: 'UpgradeModal',
      data: result,
    })
  );
});

// Page 2: Upgrade Screen Controller (Image 1)
const getUpgradeScreenController = catchAsync(async (req, res) => {
  const result = await getUpgradeScreenService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Upgrade screen data retrieved successfully',
      type: 'UpgradeScreen',
      data: result,
    })
  );
});

const getSubscriptionPlansController = getUpgradeScreenController;
const getAllPlansController = getUpgradeScreenController;

// 2. API to see my current plan & trial status
const getMyPlanController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await getMyPlanService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'My plan retrieved successfully',
      data: result,
    })
  );
});

// 3. Start 7-Day Free Trial (Immediate 1-click activation)
const startTrialController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await startTrialService(userId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: '7-Day Free Trial activated successfully',
      data: result,
    })
  );
});

// 4. API to purchase plan via Stripe (Checkout Session or Direct Payment)
const purchasePlanController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await purchasePlanService(userId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Purchase request processed successfully',
      data: result,
    })
  );
});

// 5. Create Mobile PaymentSheet / SetupIntent Parameters (For Flutter & React Native)
const createPaymentSheetController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await createPaymentSheetService(userId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Payment sheet parameters created successfully',
      data: result,
    })
  );
});

// 5b. Unified Subscribe Controller (Returns both Mobile Sheet and Web Checkout)
const subscribePlanController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await subscribePlanService(userId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Subscription session initialized successfully',
      type: 'SubscriptionSession',
      data: result,
    })
  );
});

// 6. Cancel Subscription
const cancelSubscriptionController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  const result = await cancelSubscriptionService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: result.message,
      data: result,
    })
  );
});

// 7. Stripe Webhook Listener
const stripeWebhookController = catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody || req.body;
  const result = await handleStripeWebhookService(rawBody, signature);
  return res.status(status.OK).json({ received: true, ...result });
});

// 8. Checkout Success Redirect & Instant Activation in MySubscription DB
const checkoutSuccessController = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;
  const userId = req.User?._id || req.user?._id || req.query.userId;
  const result = await handleCheckoutSuccessService(sessionId, userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: result.message,
      data: result,
    })
  );
});

module.exports = {
  getUpgradeModalController,
  getUpgradeScreenController,
  getAllPlansController,
  getMyPlanController,
  startTrialController,
  subscribePlanController,
  purchasePlanController,
  createPaymentSheetController,
  cancelSubscriptionController,
  stripeWebhookController,
  checkoutSuccessController,
};
