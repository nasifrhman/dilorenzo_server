const { default: status } = require('http-status');
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getTrainOverviewService,
  getCoachAssignmentsService,
  uploadAssignmentEvidenceService,
  getDrillDetailService,
  completeDrillSessionService,
  getTrainingPlannerService,
  getExclusiveContentService,
  updateExclusiveVideoProgressService,
} = require('./train.service');

// Helper to extract authenticated login user ID from req.user
const getLoggedInUserId = (req) => {
  return req.user?._id || req.user?.id || req.User?._id || req.User?.id || null;
};

/**
 * 1. Train Screen Master Overview (Figma Node 32772:5327)
 */
const getTrainOverviewController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getTrainOverviewService(userId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'TrainOverview',
      message: 'Train screen data retrieved successfully',
      data: result,
    })
  );
});

/**
 * 2. Coach Assignments List Screen (Figma Node 33000:12481)
 */
const getCoachAssignmentsController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getCoachAssignmentsService(userId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachAssignments',
      message: 'Coach assignments retrieved successfully',
      data: result,
    })
  );
});

/**
 * 3. Upload Assignment Evidence / Complete Assignment (Figma Node 33000:12481)
 */
const uploadAssignmentEvidenceController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.body.athleteId;
  const { assignmentId, id } = req.params;
  const targetId = assignmentId || id;
  const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
  const result = await uploadAssignmentEvidenceService(userId, targetId, file, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AssignmentEvidence',
      message: 'Assignment evidence uploaded and completed successfully',
      data: result,
    })
  );
});

/**
 * 4. Get Drill Detail
 */
const getDrillDetailController = catchAsync(async (req, res) => {
  const { drillId, id } = req.params;
  const targetId = drillId || id;
  const result = await getDrillDetailService(targetId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'DrillDetail',
      message: 'Drill details retrieved successfully',
      data: result,
    })
  );
});

/**
 * 5. Complete Drill Session
 */
const completeDrillSessionController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.body.athleteId;
  const { drillId, id } = req.params;
  const targetId = drillId || id;
  const result = await completeDrillSessionService(userId, targetId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'DrillSessionComplete',
      message: 'Drill session completed and XP awarded successfully',
      data: result,
    })
  );
});

/**
 * 6. Training Planner (Figma nodes 32954:2212 & 32954:2000)
 */
const getTrainingPlannerController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getTrainingPlannerService(userId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'TrainingPlanner',
      message: 'Training planner retrieved successfully',
      data: result,
    })
  );
});

/**
 * 7. Exclusive Content (Figma node 32959:2827)
 */
const getExclusiveContentController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.query.athleteId;
  const result = await getExclusiveContentService(userId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ExclusiveContent',
      message: 'Exclusive content retrieved successfully',
      data: result,
    })
  );
});

/**
 * 8. Update Video Watch Progress
 */
const updateExclusiveVideoProgressController = catchAsync(async (req, res) => {
  const userId = getLoggedInUserId(req) || req.body.athleteId;
  const { id, drillId } = req.params;
  const targetId = id || drillId;
  const result = await updateExclusiveVideoProgressService(userId, targetId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'VideoProgress',
      message: result.message,
      data: result,
    })
  );
});

module.exports = {
  getTrainOverviewController,
  getCoachAssignmentsController,
  uploadAssignmentEvidenceController,
  getDrillDetailController,
  completeDrillSessionController,
  getTrainingPlannerController,
  getExclusiveContentController,
  updateExclusiveVideoProgressController,
};
