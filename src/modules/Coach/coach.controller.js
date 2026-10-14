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
} = require('./coach.service');

const getCoachDashboardOverviewController = catchAsync(async (req, res) => {
  const result = await getCoachDashboardOverviewService(req.query);
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
  const result = await getCoachTasksOverviewService(req.query);
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
  const result = await getCoachTrainingOverviewService(req.query);
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
  const result = await getCoachFeedbackOverviewService(req.query);
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
  const result = await getCoachSessionsOverviewService(req.query);
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
  const result = await getCoachPlayersOverviewService(req.query);
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
  const coachId = req.query.coachId || req.user?._id;
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
  const result = await getAthleteTasksService(athleteId, req.query);
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
  const result = await getAthleteTrainingService(athleteId, req.query);
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
  const result = await getAthleteHabitsService(athleteId, req.query);
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
  const result = await getAthleteActionStepsService(athleteId, req.query);
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

const getAthleteFeedbackController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const result = await getAthleteFeedbackService(athleteId, req.query);
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

const getAthleteSessionsController = catchAsync(async (req, res) => {
  const { athleteId } = req.params;
  const result = await getAthleteSessionsService(athleteId, req.query);
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
  const result = await getAthleteProgressService(athleteId, req.query);
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
  const result = await getAthleteGroupChatService(athleteId);
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
  const coachId = req.body.coachId || req.user?._id;
  const result = await createAthleteHabitService(athleteId, req.body, coachId);
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
  const coachId = req.body.coachId || req.user?._id;
  const result = await createAthleteTaskService(athleteId, req.body, coachId);
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
  const coachId = req.body.coachId || req.user?._id;
  const result = await assignTrainingService(athleteId, req.body, coachId);
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
  const coachId = req.body.coachId || req.user?._id;
  const result = await createCoachFeedbackService(athleteId, req.body, coachId);
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
  const coachId = req.body.coachId || req.user?._id;
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

const updateSessionNotesController = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { notes } = req.body;
  const coachId = req.body.coachId || req.user?._id;
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
  const coachId = req.body.coachId || req.user?._id;
  const result = await createCoachSessionService(athleteId, req.body, coachId);
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
  const senderId = req.body.senderId || req.user?._id;
  const result = await sendAthleteGroupMessageService(athleteId, req.body, senderId);
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
  getAthleteFeedbackController,
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
  updateSessionNotesController,
  createCoachSessionController,
  sendAthleteGroupMessageController,
};
