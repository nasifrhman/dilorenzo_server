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

// Master Community Overview (Figma nodes 32823:8977, 32823:9296, 32827:9607)
router.get('/overview', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCommunityOverviewController);

// Tab 1: Community Feed (Figma node 32823:8977)
router.get('/feed', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCommunityFeedController);
router.post('/feed', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), createCommunityPostController);
router.post('/feed/:id/like', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleCommunityPostLikeController);

// Tab 2: Community Challenges (Figma node 32823:9296)
router.get('/challenges', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCommunityChallengesController);
router.post('/challenges/:id/join', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), joinCommunityChallengeController);

// Tab 3: Community Teams & Leaderboard (Figma node 32827:9607)
router.get('/teams', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCommunityTeamsController);
router.post('/teams', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), createCommunityTeamController);
router.post('/teams/:id/join', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), joinCommunityTeamController);

module.exports = router;
