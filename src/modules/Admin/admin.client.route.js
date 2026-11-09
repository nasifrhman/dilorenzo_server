const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getClientDirectoryController,
  getAthleteHubController,
  getAthleteDashTabController,
  getAthleteGoalsHabitsTabController,
  getAthleteTrainingTabController,
  getAthleteReportsTabController,
  getAthleteCalendarTabController,
} = require('./admin.client.controller');

// Client Directory (Figma Nodes 33295:19693, 33288:14067, 33288:17116, 33292:18613, 33295:19065)
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
