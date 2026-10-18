const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const {
  getCommunityOverviewController,
  getCommunityFeedController,
  createCommunityPostController,
  toggleCommunityPostLikeController,
  getCommunityChallengesController,
  joinCommunityChallengeController,
  getCommunityTeamsController,
  createCommunityTeamController,
  joinCommunityTeamController,
} = require('./community.controller');

// Authenticate user if Bearer token is provided (populates req.user & req.User)
router.use(auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }));

// Master Community Overview (Figma nodes 32823:8977, 32823:9296, 32827:9607)
router.get('/overview', getCommunityOverviewController);

// Tab 1: Community Feed (Figma node 32823:8977)
router.get('/feed', getCommunityFeedController);
router.post('/feed', createCommunityPostController);
router.post('/feed/:id/like', toggleCommunityPostLikeController);

// Tab 2: Community Challenges (Figma node 32823:9296)
router.get('/challenges', getCommunityChallengesController);
router.post('/challenges/:id/join', joinCommunityChallengeController);

// Tab 3: Community Teams & Leaderboard (Figma node 32827:9607)
router.get('/teams', getCommunityTeamsController);
router.post('/teams', createCommunityTeamController);
router.post('/teams/:id/join', joinCommunityTeamController);

module.exports = router;
