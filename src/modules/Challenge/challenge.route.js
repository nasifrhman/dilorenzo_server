const express = require('express');
const router = express.Router();
const {
  getCommunityChallengesOverviewController,
  createChallengeController,
  getChallengesController,
  getChallengeByIdController,
  updateChallengeController,
  deleteChallengeController,
  addActivityController,
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
router.delete('/:id/activities/:activityId', deleteActivityController);

// Manage Challenge: Participants Tab (Figma node 33384-5694)
router.post('/:id/participants', addParticipantController);
router.delete('/:id/participants/:athleteId', removeParticipantController);

// Manage Challenge: Award XP Action (Figma node 33384-4219)
router.post('/:id/award-xp', awardXpController);

module.exports = router;
