const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
  getClientDirectoryService,
  getAthleteHubService,
} = require('./admin.client.service');

// 1. Client Directory (All & Filtered by tab)
const getClientDirectoryController = catchAsync(async (req, res) => {
  const result = await getClientDirectoryService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ClientDirectory',
      message: 'Client directory retrieved successfully',
      data: result,
    })
  );
});

// 2. Athlete Hub (Flexible by ?tab=dash|goals-habits|training|reports|calendar|all)
const getAthleteHubController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const tab = req.query.tab || req.params.tab || 'dash';
  const result = await getAthleteHubService(athleteId, tab);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHub',
      message: 'Athlete hub details retrieved successfully',
      data: result,
    })
  );
});

// 3. Tab 1: Dash (Node 33308:7690)
const getAthleteDashTabController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const result = await getAthleteHubService(athleteId, 'dash');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHubDash',
      message: 'Athlete hub dash tab retrieved successfully',
      data: result,
    })
  );
});

// 4. Tab 2: Goals and Habits (Node 33308:8628)
const getAthleteGoalsHabitsTabController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const result = await getAthleteHubService(athleteId, 'goals-habits');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHubGoalsHabits',
      message: 'Athlete hub goals and habits tab retrieved successfully',
      data: result,
    })
  );
});

// 5. Tab 3: Training Program (Node 33309:9674)
const getAthleteTrainingTabController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const result = await getAthleteHubService(athleteId, 'training');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHubTraining',
      message: 'Athlete hub training program tab retrieved successfully',
      data: result,
    })
  );
});

// 6. Tab 4: Action Steps & Reports (Node 33309:10703)
const getAthleteReportsTabController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const result = await getAthleteHubService(athleteId, 'reports');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHubReports',
      message: 'Athlete hub action steps and reports tab retrieved successfully',
      data: result,
    })
  );
});

// 7. Tab 5: Calendar (Node 33309:11542)
const getAthleteCalendarTabController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const result = await getAthleteHubService(athleteId, 'calendar');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AthleteHubCalendar',
      message: 'Athlete hub calendar tab retrieved successfully',
      data: result,
    })
  );
});

module.exports = {
  getClientDirectoryController,
  getAthleteHubController,
  getAthleteDashTabController,
  getAthleteGoalsHabitsTabController,
  getAthleteTrainingTabController,
  getAthleteReportsTabController,
  getAthleteCalendarTabController,
};
