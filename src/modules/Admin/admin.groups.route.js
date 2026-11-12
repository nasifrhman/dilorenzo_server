const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getAdminGroupsListController,
  getAdminGroupDetailsController,
  sendAdminGroupMessageController,
  createAdminGroupController,
  reassignAdminGroupCoachController,
  getAdminGroupSidebarController,
  getAdminGroupSummaryTabController,
  getAdminGroupFilesTabController,
  getAdminGroupTimelineTabController,
  getAdminGroupMembersTabController,
} = require('./admin.groups.controller');

// Allow admin, super_admin, sub_admin, coach (with optional auth so postman calls without tokens also succeed gracefully)
const allowAdminOrCoach = auth(['admin', 'super_admin', 'sub_admin', 'coach', 'user', 'athlete'], { optional: true });

// 1. Groups List (Left panel)
router.get('/', allowAdminOrCoach, getAdminGroupsListController);
router.get('/list', allowAdminOrCoach, getAdminGroupsListController);

// 2. Create / Launch New 3-Way Group (+ NEW button)
router.post('/', allowAdminOrCoach, createAdminGroupController);
router.post('/create', allowAdminOrCoach, createAdminGroupController);

// 3. Group Details & Message History (Center panel)
router.get('/:chatRoomId', allowAdminOrCoach, getAdminGroupDetailsController);
router.get('/:chatRoomId/messages', allowAdminOrCoach, getAdminGroupDetailsController);

// 4. Send Message into 3-Way Group
router.post('/:chatRoomId/messages', allowAdminOrCoach, sendAdminGroupMessageController);
router.post('/:chatRoomId/message', allowAdminOrCoach, sendAdminGroupMessageController);
router.post('/:chatRoomId/send', allowAdminOrCoach, sendAdminGroupMessageController);

// 5. Reassign Coach for 3-Way Group
router.patch('/:chatRoomId/reassign-coach', allowAdminOrCoach, reassignAdminGroupCoachController);
router.post('/:chatRoomId/reassign-coach', allowAdminOrCoach, reassignAdminGroupCoachController);

// 6. Sidebar (Supports ?tab=summary|files|timeline|members or returns all tabs)
router.get('/:chatRoomId/sidebar', allowAdminOrCoach, getAdminGroupSidebarController);

// 7. Tab Specific Direct Endpoints
router.get('/:chatRoomId/summary', allowAdminOrCoach, getAdminGroupSummaryTabController);
router.get('/:chatRoomId/files', allowAdminOrCoach, getAdminGroupFilesTabController);
router.get('/:chatRoomId/timeline', allowAdminOrCoach, getAdminGroupTimelineTabController);
router.get('/:chatRoomId/members', allowAdminOrCoach, getAdminGroupMembersTabController);

module.exports = router;

