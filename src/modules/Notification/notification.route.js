const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getCoachNotificationsController,
  getUserNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
  getNotificationBadgeCountController,
  createNotificationController,
} = require('./notification.controller');

// Optional auth so demo/queries work with or without active Bearer token
router.use(auth(['coach', 'admin', 'user', 'athlete', 'parent'], { optional: true }));

// Coach notifications (Figma Node 33102:1009)
router.get('/coach', getCoachNotificationsController);

// User / Athlete notifications (Figma Node 32761:3698)
router.get('/user', getUserNotificationsController);
router.get('/my-notifications', getUserNotificationsController);

// Smart root handler: if token is coach, returns coach notifications; otherwise athlete notifications
router.get('/', (req, res, next) => {
  const role = req.user?.role || req.User?.role;
  if (role === 'coach') {
    return getCoachNotificationsController(req, res, next);
  }
  return getUserNotificationsController(req, res, next);
});

// Badge count
router.get('/badge', getNotificationBadgeCountController);
router.get('/badge-count', getNotificationBadgeCountController);

// Mark all as read
router.patch('/mark-all-read', markAllNotificationsAsReadController);
router.patch('/read-all', markAllNotificationsAsReadController);
router.put('/mark-all-read', markAllNotificationsAsReadController);
router.put('/read-all', markAllNotificationsAsReadController);

// Mark single as read
router.patch('/:id/read', markNotificationAsReadController);
router.put('/:id/read', markNotificationAsReadController);

// Delete / Dismiss
router.delete('/:id', deleteNotificationController);

// Create manual notification
router.post('/', createNotificationController);

module.exports = router;
