const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getUserAnnouncementsController,
  createBroadcastAnnouncementController,
} = require('./announcement.controller');

const allowAuth = auth(['admin', 'super_admin', 'sub_admin', 'coach', 'user', 'athlete', 'parent'], { optional: true });

// 1. User End: User sees announcements (Mobile App: Profile > Announcements)
router.get('/', allowAuth, getUserAnnouncementsController);

// 2. Admin End: Admin creates / broadcasts announcement (Modal: Broadcast Platform Announcement)
router.post('/', allowAuth, createBroadcastAnnouncementController);
router.post('/broadcast', allowAuth, createBroadcastAnnouncementController);

module.exports = router;
