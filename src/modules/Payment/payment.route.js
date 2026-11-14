const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getAllPlansController,
  getMyPlanController,
  purchasePlanController,
  stripeWebhookController,
  checkoutSuccessController,
} = require('./payment.controller');

const ALL_ROLES = ['user', 'athlete', 'admin', 'coach', 'parent'];

// 1. API to see all plans (Public or Authenticated)
router.get('/plans', getAllPlansController);

// 2. API to see my plan
router.get('/my-plan', auth(ALL_ROLES), getMyPlanController);

// 3. API to purchase plan
router.post('/purchase', auth(ALL_ROLES), purchasePlanController);

// 4. Stripe Webhook (Public)
router.post('/webhook', stripeWebhookController);

// 5. Checkout Success Redirect
router.get('/success', checkoutSuccessController);

module.exports = router;
