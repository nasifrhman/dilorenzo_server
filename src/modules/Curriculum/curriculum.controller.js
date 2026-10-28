const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { status } = require('http-status');
const {
  getAdminScheduleService,
  getAdminMissionsService,
  createMissionService,
  updateMissionService,
  deleteMissionService,
  makeLiveNowService,
  getTodayMissionService,
  completeTodayMissionService,
  purchaseMentorshipService,
  getMentorshipProgramService,
} = require('./curriculum.service');

const getLoggedInUserId = (req) => {
  return req.user?._id || req.User?._id || req.userId || null;
};

/**
 * 1. Admin: Get 90-Day Curriculum Schedule (Figma Node 33304:2397)
 */
const getAdminScheduleController = catchAsync(async (req, res) => {
  const result = await getAdminScheduleService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CurriculumSchedule',
      message: '90-Day curriculum schedule retrieved successfully',
      data: result,
    })
  );
});

/**
 * 1b. Admin: Get Curriculum Missions List (Clean Flat List)
 */
const getAdminMissionsController = catchAsync(async (req, res) => {
  const result = await getAdminMissionsService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CurriculumMissions',
      message: 'Curriculum missions retrieved successfully',
      data: result,
    })
  );
});

/**
 * 2. Admin: Add New Mission to 90-Day Schedule (Modal Figma 34010:5098)
 */
const createMissionController = catchAsync(async (req, res) => {
  const adminId = getLoggedInUserId(req);
  const result = await createMissionService(adminId, req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'CurriculumMission',
      message: 'Mission added to 90-day schedule successfully',
      data: result,
    })
  );
});

/**
 * 3. Admin: Update Mission By ID
 */
const updateMissionController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await updateMissionService(id, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CurriculumMission',
      message: 'Curriculum mission updated successfully',
      data: result,
    })
  );
});

/**
 * 4. Admin: Delete Mission By ID
 */
const deleteMissionController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await deleteMissionService(id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CurriculumMission',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 5. Admin: Make Day/Mission Live Now (Immediate Override on Member App)
 */
const makeLiveNowController = catchAsync(async (req, res) => {
  const identifier = req.params.dayNumber || req.params.id || req.body.dayNumber || req.body.missionId;
  const result = await makeLiveNowService(identifier);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CurriculumMissionLive',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 6. User: Get Today's Mission (Hero Section - Figma Node 32682:3299)
 */
const getTodayMissionController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getTodayMissionService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'TodayMission',
      message: "Today's mission retrieved successfully",
      data: result,
    })
  );
});

/**
 * 7. User: Complete Today's Mission (+XP Awarded & Streak Incremented)
 */
const completeTodayMissionController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.body.athleteId;
  const missionId = req.params.id || req.body.missionId;
  const result = await completeTodayMissionService(userId, missionId, req.body.notes);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'MissionComplete',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 8. User: Purchase / Enroll in 90-Day Mentorship
 */
const purchaseMentorshipController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.body.athleteId;
  const result = await purchaseMentorshipService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'MentorshipEnrollment',
      message: result.message,
      data: result,
    })
  );
});

/**
 * 9. User: Get Mentorship Program Progress
 */
const getMentorshipProgramController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getMentorshipProgramService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'MentorshipProgram',
      message: 'Mentorship program overview retrieved successfully',
      data: result,
    })
  );
});

module.exports = {
  getAdminScheduleController,
  getAdminMissionsController,
  createMissionController,
  updateMissionController,
  deleteMissionController,
  makeLiveNowController,
  getTodayMissionController,
  completeTodayMissionController,
  purchaseMentorshipController,
  getMentorshipProgramController,
};
