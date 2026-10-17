const { default: status } = require('http-status');
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getCommunityOverviewService,
  getCommunityFeedService,
  createCommunityPostService,
  toggleCommunityPostLikeService,
  getCommunityChallengesService,
  joinCommunityChallengeService,
  getCommunityTeamsService,
  createCommunityTeamService,
  joinCommunityTeamService,
} = require('./community.service');

// Helper to extract authenticated login user ID from req.user
const getLoggedInUserId = (req) => {
  return req.user?._id || req.user?.id || req.User?._id || req.User?.id || null;
};

/**
 * Get Community Master Overview (Figma nodes 32823:8977, 32823:9296, 32827:9607)
 */
const getCommunityOverviewController = catchAsync(async (req, res) => {
  const athleteId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getCommunityOverviewService(athleteId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityOverview',
      message: 'Community overview retrieved successfully',
      data: result,
    })
  );
});

/**
 * 1. Community Feed (Figma node 32823:8977)
 */
const getCommunityFeedController = catchAsync(async (req, res) => {
  const { category, page, limit } = req.query;
  const athleteId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getCommunityFeedService({ category, page, limit, athleteId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityFeed',
      message: 'Community feed retrieved successfully',
      data: result,
    })
  );
});

/**
 * Create Mindset Win Post (Figma node 32823:8977 "+ Share Your Mindset Win")
 * Takes logged-in user ID directly from req.user
 */
const createCommunityPostController = catchAsync(async (req, res) => {
  const currentUserId = getLoggedInUserId(req) || req.body.athleteId;
  const result = await createCommunityPostService(req.body, currentUserId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'CommunityPost',
      message: 'Mindset win shared successfully',
      data: result,
    })
  );
});

/**
 * Like / Cheer Post (Figma node 32823:8977)
 * Takes logged-in user ID directly from req.user
 */
const toggleCommunityPostLikeController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = getLoggedInUserId(req) || req.body.athleteId || req.query.athleteId;
  const result = await toggleCommunityPostLikeService(id, currentUserId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityPostLike',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 2. Community Challenges (Figma node 32823:9296)
 */
const getCommunityChallengesController = catchAsync(async (req, res) => {
  const athleteId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getCommunityChallengesService(athleteId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityChallenges',
      message: 'Community challenges retrieved successfully',
      data: result,
    })
  );
});

/**
 * Join Challenge (Figma node 32823:9296 "Join Now")
 * Takes logged-in user ID directly from req.user
 */
const joinCommunityChallengeController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = getLoggedInUserId(req) || req.body.athleteId || req.query.athleteId;
  const result = await joinCommunityChallengeService(id, currentUserId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ChallengeParticipation',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 3. Community Teams (Figma node 32827:9607)
 */
const getCommunityTeamsController = catchAsync(async (req, res) => {
  const athleteId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getCommunityTeamsService(athleteId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityTeams',
      message: 'Community team leaderboard retrieved successfully',
      data: result,
    })
  );
});

/**
 * Create Team (Figma node 32827:9607 "+ Create or Join a Team")
 * Takes logged-in user ID directly from req.user
 */
const createCommunityTeamController = catchAsync(async (req, res) => {
  const currentUserId = getLoggedInUserId(req) || req.body.athleteId;
  const result = await createCommunityTeamService(req.body, currentUserId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'CommunityTeam',
      message: result.message,
      data: result,
    })
  );
});

/**
 * Join Team
 * Takes logged-in user ID directly from req.user
 */
const joinCommunityTeamController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = getLoggedInUserId(req) || req.body.athleteId || req.query.athleteId;
  const result = await joinCommunityTeamService(id, currentUserId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'TeamMembership',
      message: result.message,
      data: result,
    })
  );
});

module.exports = {
  getCommunityOverviewController,
  getCommunityFeedController,
  createCommunityPostController,
  toggleCommunityPostLikeController,
  getCommunityChallengesController,
  joinCommunityChallengeController,
  getCommunityTeamsController,
  createCommunityTeamController,
  joinCommunityTeamController,
};
