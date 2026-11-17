const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
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
} = require('./payment.controller');

const ALL_ROLES = ['user', 'athlete', 'admin', 'coach', 'parent'];

// ==============================================================================
// 1. CONTENT APIS FOR THE 2 SCREENS
// ==============================================================================

// Page 1: Upgrade Modal / Bottom Sheet (Design Image 1)
router.get('/modal', getUpgradeModalController);
router.get('/bottom-sheet', getUpgradeModalController);

// Page 2: Full Upgrade Screen (Design Image 2: Header, Comparison Table, 90-Day Mentorship)
router.get('/screen', getUpgradeScreenController);
router.get('/upgrade-screen', getUpgradeScreenController);
router.get('/plans', getUpgradeScreenController); // backward compatibility alias
router.get('/', getUpgradeScreenController);

// User's Active Subscription & Trial Status
router.get('/my-plan', auth(ALL_ROLES), getMyPlanController);
router.get('/status', auth(ALL_ROLES), getMyPlanController);

// ==============================================================================
// 2. USER ACTION APIS
// ==============================================================================

// Purchase / Subscribe to Plan via Stripe (Monthly or Annual with 7-Day Free Trial)
router.post('/subscribe', auth(ALL_ROLES), subscribePlanController);
router.post('/purchase', auth(ALL_ROLES), subscribePlanController);
router.post('/start-trial', auth(ALL_ROLES), subscribePlanController); // backward compatibility alias
router.post('/trial', auth(ALL_ROLES), subscribePlanController);
router.post('/payment-sheet', auth(ALL_ROLES), createPaymentSheetController);

// Cancel Active Subscription / Trial
router.post('/cancel', auth(ALL_ROLES), cancelSubscriptionController);

// ==============================================================================
// 3. STRIPE WEBHOOK & REDIRECT
// ==============================================================================
router.post('/webhook', stripeWebhookController);
router.get('/success', checkoutSuccessController);

module.exports = router;
