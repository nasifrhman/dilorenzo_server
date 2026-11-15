const express = require('express');
const router = express.Router();
const {
  getCommunityChallengesOverviewController,
  createChallengeController,
  getChallengesController,
  getChallengeByIdController,
  getChallengeLeaderboardController,
  updateChallengeController,
  deleteChallengeController,
  addActivityController,
  updateActivityController,
  deleteActivityController,
  addParticipantController,
  removeParticipantController,
  awardXpController,
} = require('./challenge.controller');
const { auth } = require('../../middlewares/auth');
const {
  getUserCompetePageController,
  joinCompeteChallengeController,
} = require('../User/user.controller');

// Compete Screen & Leaderboard (Figma node 32817:6437)
router.get('/compete', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getUserCompetePageController);
router.post('/:id/join', auth(['user', 'athlete', 'admin', 'coach', 'parent']), joinCompeteChallengeController);
router.post('/challenges/:id/join', auth(['user', 'athlete', 'admin', 'coach', 'parent']), joinCompeteChallengeController);

// Overview Dashboard Page (Figma node 33299-22507: Community Challenges)
router.get('/overview', getCommunityChallengesOverviewController);

// Challenge CRUD & Listing
router.post('/', createChallengeController);
router.get('/', getChallengesController);
router.get('/:id', getChallengeByIdController);
router.patch('/:id', updateChallengeController);
router.delete('/:id', deleteChallengeController);

// Manage Challenge: Activities Tab (Figma node 33384-5212)
router.post('/:id/activities', addActivityController);
router.patch('/:id/activities/:activityId', updateActivityController);
router.put('/:id/activities/:activityId', updateActivityController);
router.delete('/:id/activities/:activityId', deleteActivityController);

// Manage Challenge: Participants & Leaderboard (Figma nodes 33384-5694, 33384-6692)
router.get('/:id/leaderboard', getChallengeLeaderboardController);
router.post('/:id/participants', addParticipantController);
router.delete('/:id/participants/:athleteId', removeParticipantController);

// Manage Challenge: Award XP Action (Figma node 33384-4219)
router.post('/:id/award-xp', awardXpController);

module.exports = router;
