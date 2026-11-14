const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
  getAllPlansService,
  getMyPlanService,
  purchasePlanService,
  handleStripeWebhookService,
} = require('./payment.service');

// 1. API to see all plans
const getAllPlansController = catchAsync(async (req, res) => {
  const result = await getAllPlansService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Plans retrieved successfully',
      data: result,
    })
  );
});

// 2. API to see my plan
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

// 3. API to purchase plan
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

// 4. Stripe Webhook Listener
const stripeWebhookController = catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody || req.body;
  const result = await handleStripeWebhookService(rawBody, signature);
  return res.status(status.OK).json({ received: true, ...result });
});

// 5. Checkout Success Redirect
const checkoutSuccessController = catchAsync(async (req, res) => {
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      message: 'Subscription activated successfully! Welcome to Academy.',
      data: {
        tier: 'premium',
        status: 'active',
      },
    })
  );
});

module.exports = {
  getAllPlansController,
  getMyPlanController,
  purchasePlanController,
  stripeWebhookController,
  checkoutSuccessController,
};
