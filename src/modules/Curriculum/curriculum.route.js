const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getAdminScheduleController,
  getAdminMissionsController,
  createMissionController,
  updateMissionController,
  deleteMissionController,
  makeLiveNowController,
  completeTodayMissionController,
  purchaseMentorshipController,
  getMentorshipProgramController,
} = require('./curriculum.controller');

const ADMIN_ROLES = ['admin', 'super_admin', 'sub_admin'];
const ALL_ROLES = ['user', 'athlete', 'coach', 'admin', 'super_admin', 'sub_admin', 'parent'];

// ==========================================
// USER ROUTES (MEMBER APP)
// ==========================================

// 1. Mark Mission Complete (+XP & Streak Awarded)
router.post('/missions/:id/complete', auth(ALL_ROLES), completeTodayMissionController);
router.post('/today/complete', auth(ALL_ROLES), completeTodayMissionController);

// 3. Purchase / Enroll in 90-Day Mentorship
router.post('/purchase', auth(ALL_ROLES), purchaseMentorshipController);
router.post('/enroll', auth(ALL_ROLES), purchaseMentorshipController);

// 4. Get 90-Day Mentorship Program Progress
router.get('/progress', auth(ALL_ROLES, { optional: true }), getMentorshipProgramController);
router.get('/program', auth(ALL_ROLES, { optional: true }), getMentorshipProgramController);

// ==========================================
// ADMIN ROUTES (MASTER LIBRARIES / DASHBOARD)
// ==========================================

// 5. Get 90-Day Curriculum Schedule & Daily Mission Manager (Figma Node 33304:2397)
router.get('/admin/schedule', auth(ADMIN_ROLES, { optional: true }), getAdminScheduleController);
router.get('/schedule', auth(ADMIN_ROLES, { optional: true }), getAdminScheduleController);
router.get('/admin/days', auth(ADMIN_ROLES, { optional: true }), getAdminScheduleController);
router.get('/days', auth(ADMIN_ROLES, { optional: true }), getAdminScheduleController);
router.get('/overview', auth(ADMIN_ROLES, { optional: true }), getAdminScheduleController);

// 5b. Get Flat List of Configured Curriculum Missions
router.get('/admin/missions', auth(ADMIN_ROLES, { optional: true }), getAdminMissionsController);
router.get('/missions', auth(ADMIN_ROLES, { optional: true }), getAdminMissionsController);

// 6. Add Brand New Mission to 90-Day Schedule (Modal Figma 34010:5098)
router.post('/admin/missions', auth(ADMIN_ROLES, { optional: true }), createMissionController);
router.post('/missions', auth(ADMIN_ROLES, { optional: true }), createMissionController);
router.post('/admin/days', auth(ADMIN_ROLES, { optional: true }), createMissionController);

// 7. Make Day/Mission Live Now (Immediate Override on Member App Hero Section)
router.post('/admin/days/:dayNumber/make-live', auth(ADMIN_ROLES, { optional: true }), makeLiveNowController);
router.post('/admin/missions/:id/make-live', auth(ADMIN_ROLES, { optional: true }), makeLiveNowController);
router.post('/admin/make-live', auth(ADMIN_ROLES, { optional: true }), makeLiveNowController);

// 8. Update Curriculum Mission By ID
router.put('/admin/missions/:id', auth(ADMIN_ROLES, { optional: true }), updateMissionController);
router.put('/missions/:id', auth(ADMIN_ROLES, { optional: true }), updateMissionController);
router.patch('/admin/missions/:id', auth(ADMIN_ROLES, { optional: true }), updateMissionController);
router.patch('/missions/:id', auth(ADMIN_ROLES, { optional: true }), updateMissionController);

// 9. Delete Curriculum Mission By ID
router.delete('/admin/missions/:id', auth(ADMIN_ROLES, { optional: true }), deleteMissionController);
router.delete('/missions/:id', auth(ADMIN_ROLES, { optional: true }), deleteMissionController);

module.exports = router;
