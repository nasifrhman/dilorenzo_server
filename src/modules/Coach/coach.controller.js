const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getCoachDashboardOverviewService,
  getCoachTasksOverviewService,
  getCoachTrainingOverviewService,
  getCoachFeedbackOverviewService,
  getCoachSessionsOverviewService,
  getCoachPlayersOverviewService,
  getCoachPlayerOverviewService,
  getCoachPlayerDetailService,
  getAthleteTasksService,
  getAthleteTrainingService,
  getAthleteHabitsService,
  getAthleteActionStepsService,
  getAthleteFeedbackService,
  getAthleteSessionsService,
  getAthleteProgressService,
  getAthleteGroupChatService,
  createAthleteHabitService,
  updateAthleteHabitService,
  toggleHabitStatusService,
  createAthleteTaskService,
  toggleTaskStatusService,
  assignTrainingService,
  createCoachFeedbackService,
  reviewActionStepService,
  updateSessionNotesService,
  createCoachSessionService,
  sendAthleteGroupMessageService,
  assignAthleteActionStepService,
  submitAthleteActionStepService,
  getActionStepDetailService,
  getFeedbackDetailService,
  getCoachesSimpleListService,
} = require('./coach.service');
const User = require('../User/user.model');

// Helper to extract authenticated login user ID from req.user (populated by JWT Bearer token)
const getLoggedInUserId = (req) => {
  return req.user?._id || req.user?.id || req.User?._id || req.User?.id || null;
};

const getCoachDashboardOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachDashboardOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachDashboardOverview',
      message: 'Coach dashboard overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachTasksOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachTasksOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachTasksOverview',
      message: 'Coach tasks overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachTrainingOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachTrainingOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachTrainingOverview',
      message: 'Coach training programs overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachFeedbackOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachFeedbackOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachFeedbackOverview',
      message: 'Coach feedback overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachSessionsOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachSessionsOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachSessionsOverview',
      message: 'Coach sessions overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachPlayersOverviewController = catchAsync(async (req, res) => {
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachPlayersOverviewService({ ...req.query, coachId });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachPlayersOverview',
      message: 'Coach players roster overview retrieved successfully',
      data: result,
    })
  );
});

const getCoachPlayerDetailController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const coachId = getLoggedInUserId(req) || req.query.coachId;
  const result = await getCoachPlayerDetailService(athleteId, coachId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachPlayerOverview',
      message: 'Coach player overview retrieved successfully',
      data: result,
    })
  );
});

const getAthleteTasksController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteTasksService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteTasks',
      message: 'Athlete tasks retrieved successfully',
      data: result,
    })
  );
});

const getAthleteTrainingController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteTrainingService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteTraining',
      message: 'Athlete training assignments retrieved successfully',
      data: result,
    })
  );
});

const getAthleteHabitsController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteHabitsService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHabits',
      message: 'Athlete habits retrieved successfully',
      data: result,
    })
  );
});

const getAthleteActionStepsController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  let targetAthleteId = (athleteId && athleteId !== 'me' && athleteId !== 'action-steps')
    ? athleteId
    : (req.query.athleteId || req.query.adminId || req.query.userId);

  if (!targetAthleteId) {
    const loggedInId = getLoggedInUserId(req);
    if (loggedInId && req.user?.role !== 'coach' && req.user?.role !== 'admin') {
      targetAthleteId = loggedInId;
    } else {
      const sampleAthlete = await User.findOne({ role: 'athlete' }).select('_id');
      targetAthleteId = sampleAthlete ? sampleAthlete._id.toString() : '6acc80dca1df2a2ed315c20e';
    }
  }

  const result = await getAthleteActionStepsService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteActionSteps',
      message: 'Athlete action steps retrieved successfully',
      data: result,
    })
  );
});

const getActionStepDetailController = catchAsync(async (req, res) => {
  const { actionStepId, id } = req.params;
  const targetId = actionStepId || id;
  const result = await getActionStepDetailService(targetId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ActionStepDetail',
      message: 'Action step detail retrieved successfully',
      data: result,
    })
  );
});

const getAthleteFeedbackController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteFeedbackService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachFeedback',
      message: 'Athlete coach feedback retrieved successfully',
      data: result,
    })
  );
});

const getFeedbackDetailController = catchAsync(async (req, res) => {
  const { feedbackId, id } = req.params;
  const targetId = feedbackId || id;
  const result = await getFeedbackDetailService(targetId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachFeedbackDetail',
      message: 'Coach feedback detail retrieved successfully',
      data: result,
    })
  );
});

const getAthleteSessionsController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteSessionsService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteSessions',
      message: 'Athlete sessions retrieved successfully',
      data: result,
    })
  );
});

const getAthleteProgressController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteProgressService(targetAthleteId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteProgress',
      message: 'Athlete progress analytics retrieved successfully',
      data: result,
    })
  );
});

const getAthleteGroupChatController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (getLoggedInUserId(req) || req.query.athleteId || athleteId);
  const result = await getAthleteGroupChatService(targetAthleteId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteGroupChat',
      message: 'Athlete group chat retrieved successfully',
      data: result,
    })
  );
});

const createAthleteHabitController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await createAthleteHabitService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AthleteHabit',
      message: 'Athlete habit created successfully',
      data: result,
    })
  );
});

const updateAthleteHabitController = catchAsync(async (req, res) => {
  const { habitId } = req.params;
  const result = await updateAthleteHabitService(habitId, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHabit',
      message: 'Athlete habit updated successfully',
      data: result,
    })
  );
});

const toggleHabitStatusController = catchAsync(async (req, res) => {
  const { habitId } = req.params;
  const result = await toggleHabitStatusService(habitId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHabitStatus',
      message: `Athlete habit ${result.status === 'paused' ? 'paused' : 'resumed'} successfully`,
      data: result,
    })
  );
});

const createAthleteTaskController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await createAthleteTaskService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AthleteTask',
      message: 'Task assigned successfully',
      data: result,
    })
  );
});

const toggleTaskStatusController = catchAsync(async (req, res) => {
  const { taskId } = req.params;
  const result = await toggleTaskStatusService(taskId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteTask',
      message: 'Task status updated successfully',
      data: result,
    })
  );
});

const assignTrainingController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await assignTrainingService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'TrainingAssignment',
      message: 'Training assigned successfully',
      data: result,
    })
  );
});

const createCoachFeedbackController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await createCoachFeedbackService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'CoachFeedback',
      message: 'Coach feedback sent successfully',
      data: result,
    })
  );
});

const reviewActionStepController = catchAsync(async (req, res) => {
  const { actionStepId } = req.params;
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await reviewActionStepService(actionStepId, req.body, coachId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ActionStepReview',
      message: 'Action step reviewed successfully',
      data: result,
    })
  );
});

const assignAthleteActionStepController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  let targetAthleteId = (athleteId && athleteId !== 'me' && athleteId !== 'assign' && athleteId !== 'action-steps')
    ? athleteId
    : (req.body.athleteId || req.body.adminId || req.body.userId || req.body.targetUserId || req.query.athleteId || req.query.adminId || req.query.userId);

  if (!targetAthleteId) {
    const sampleAthlete = await User.findOne({ role: 'athlete' }).select('_id');
    targetAthleteId = sampleAthlete ? sampleAthlete._id.toString() : '6acc80dca1df2a2ed315c20e';
  }

  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await assignAthleteActionStepService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'ActionStepAssignment',
      message: result.message || 'Assignment created and assigned successfully',
      data: result,
    })
  );
});

const submitAthleteActionStepController = catchAsync(async (req, res) => {
  const { actionStepId, id } = req.params;
  const targetId = actionStepId || id;
  let files = [];
  if (Array.isArray(req.files)) {
    files = req.files;
  } else if (req.files && typeof req.files === 'object') {
    files = Object.values(req.files).flat();
  } else if (req.file) {
    files = [req.file];
  }
  const result = await submitAthleteActionStepService(targetId, req.body, files);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ActionStepSubmission',
      message: result.message || 'Action step submitted successfully',
      data: result,
    })
  );
});

const updateSessionNotesController = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { notes } = req.body;
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await updateSessionNotesService(sessionId, notes, coachId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'SessionNotes',
      message: 'Session notes updated successfully',
      data: result,
    })
  );
});

const createCoachSessionController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const coachId = getLoggedInUserId(req) || req.body.coachId;
  const result = await createCoachSessionService(targetAthleteId, req.body, coachId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Session',
      message: 'Session scheduled successfully',
      data: result,
    })
  );
});

const sendAthleteGroupMessageController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const targetAthleteId = (athleteId && athleteId !== 'me')
    ? athleteId
    : (req.body.athleteId || getLoggedInUserId(req));
  const senderId = getLoggedInUserId(req) || req.body.senderId;
  const result = await sendAthleteGroupMessageService(targetAthleteId, req.body, senderId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'GroupMessage',
      message: 'Message sent to group successfully',
      data: result,
    })
  );
});

const getCoachesSimpleListController = catchAsync(async (req, res) => {
  const result = await getCoachesSimpleListService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Coaches',
      message: 'Coaches retrieved successfully',
      data: result,
    })
  );
});

module.exports = {
  getCoachDashboardOverviewController,
  getCoachTasksOverviewController,
  getCoachTrainingOverviewController,
  getCoachFeedbackOverviewController,
  getCoachSessionsOverviewController,
  getCoachPlayersOverviewController,
  getCoachPlayerDetailController,
  getCoachPlayerOverviewController: getCoachPlayerDetailController,
  getAthleteTasksController,
  getAthleteTrainingController,
  getAthleteHabitsController,
  getAthleteActionStepsController,
  getActionStepDetailController,
  getAthleteFeedbackController,
  getFeedbackDetailController,
  getAthleteSessionsController,
  getAthleteProgressController,
  getAthleteGroupChatController,
  createAthleteHabitController,
  updateAthleteHabitController,
  toggleHabitStatusController,
  createAthleteTaskController,
  toggleTaskStatusController,
  assignTrainingController,
  createCoachFeedbackController,
  reviewActionStepController,
  assignAthleteActionStepController,
  submitAthleteActionStepController,
  updateSessionNotesController,
  createCoachSessionController,
  sendAthleteGroupMessageController,
  getCoachesSimpleListController,
};
