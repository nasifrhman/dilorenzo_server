const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getClientDirectoryController,
  exportClientDirectoryCsvController,
  getAthleteHubController,
  getAthleteDashTabController,
  getAthleteGoalsHabitsTabController,
  getAthleteTrainingTabController,
  getAthleteReportsTabController,
  getAthleteCalendarTabController,
  getAdminDashboardOverviewController,
  getAdminPaymentsController,
  createAdminInvoiceController,
  exportAdminPaymentsCsvController,
  getAdminBusinessMetricsController,
  exportAdminBusinessReportController,
  getAdminNotificationsController,
  markAdminNotificationReadController,
  markAllAdminNotificationsReadController,
  getAdminUniversalSearchController,
  createAthleteHabitController,
  createAthleteEventController,
} = require('./admin.client.controller');

const ADMIN_ROLES = ['admin', 'super_admin', 'sub_admin', 'coach'];

// 1. Admin Dashboard Overview
router.get('/dashboard', auth(ADMIN_ROLES, { optional: true }), getAdminDashboardOverviewController);
router.get('/overview', auth(ADMIN_ROLES, { optional: true }), getAdminDashboardOverviewController);

// 2. Admin Payments Management
router.get('/payments/export', auth(ADMIN_ROLES, { optional: true }), exportAdminPaymentsCsvController);
router.get('/payments', auth(ADMIN_ROLES, { optional: true }), getAdminPaymentsController);
router.post('/payments', auth(ADMIN_ROLES, { optional: true }), createAdminInvoiceController);
router.post('/payments/invoice', auth(ADMIN_ROLES, { optional: true }), createAdminInvoiceController);

// 3. Admin Business Metrics
router.get('/business/export', auth(ADMIN_ROLES, { optional: true }), exportAdminBusinessReportController);
router.get('/business', auth(ADMIN_ROLES, { optional: true }), getAdminBusinessMetricsController);

// 4. Admin Notifications
router.get('/notifications', auth(ADMIN_ROLES, { optional: true }), getAdminNotificationsController);
router.patch('/notifications/read-all', auth(ADMIN_ROLES, { optional: true }), markAllAdminNotificationsReadController);
router.patch('/notifications/:id/read', auth(ADMIN_ROLES, { optional: true }), markAdminNotificationReadController);

// 5. Top Bar Universal Search
router.get('/search', auth(ADMIN_ROLES, { optional: true }), getAdminUniversalSearchController);

// Athlete Hub Actions (AM5)
router.post('/clients/:athleteId/habits', auth(ADMIN_ROLES, { optional: true }), createAthleteHabitController);
router.post('/:athleteId/habits', auth(ADMIN_ROLES, { optional: true }), createAthleteHabitController);
router.post('/clients/:athleteId/events', auth(ADMIN_ROLES, { optional: true }), createAthleteEventController);
router.post('/:athleteId/events', auth(ADMIN_ROLES, { optional: true }), createAthleteEventController);

// Client Directory (Figma Nodes 33295:19693, 33288:14067, 33288:17116, 33292:18613, 33295:19065)
router.get('/clients/export', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), exportClientDirectoryCsvController);
router.get('/export', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), exportClientDirectoryCsvController);
router.get('/', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getClientDirectoryController);
router.get('/clients', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getClientDirectoryController);
router.get('/directory', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getClientDirectoryController);

// Athlete Hub Full / Tab Navigation (Figma Nodes 33308:7690, 33308:8628, 33309:9674, 33309:10703, 33309:11542)
router.get('/clients/:athleteId/hub', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteHubController);
router.get('/clients/:athleteId', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteHubController);
router.get('/:athleteId/hub', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteHubController);

// Sub-Tab Routes
// Tab 1: Dash (Node 33308:7690)
router.get('/clients/:athleteId/dash', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteDashTabController);
router.get('/:athleteId/dash', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteDashTabController);

// Tab 2: Goals and Habits (Node 33308:8628)
router.get('/clients/:athleteId/goals-habits', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteGoalsHabitsTabController);
router.get('/:athleteId/goals-habits', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteGoalsHabitsTabController);

// Tab 3: Training Program (Node 33309:9674)
router.get('/clients/:athleteId/training', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteTrainingTabController);
router.get('/:athleteId/training', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteTrainingTabController);

// Tab 4: Action Steps & Reports (Node 33309:10703)
router.get('/clients/:athleteId/reports', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteReportsTabController);
router.get('/:athleteId/reports', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteReportsTabController);

// Tab 5: Calendar (Node 33309:11542)
router.get('/clients/:athleteId/calendar', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteCalendarTabController);
router.get('/:athleteId/calendar', auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), getAthleteCalendarTabController);

module.exports = router;
