const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
  getClientDirectoryService,
  exportClientDirectoryCsvService,
  getAthleteHubService,
  getAdminDashboardOverviewService,
  getAdminPaymentsService,
  createAdminInvoiceService,
  exportAdminPaymentsCsvService,
  getAdminBusinessMetricsService,
  exportAdminBusinessReportService,
  getAdminNotificationsService,
  markAdminNotificationReadService,
  markAllAdminNotificationsReadService,
  getAdminUniversalSearchService,
  createAthleteHabitService,
  createAthleteEventService,
} = require('./admin.client.service');

// 1. Client Directory (All & Filtered by tab, with CSV export support)
const getClientDirectoryController = catchAsync(async (req, res) => {
  if (req.query.export === 'csv') {
    const csvData = await exportClientDirectoryCsvService(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients_export.csv"');
    return res.status(status.OK).send(csvData);
  }

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

const exportClientDirectoryCsvController = catchAsync(async (req, res) => {
  const csvData = await exportClientDirectoryCsvService(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="clients_export.csv"');
  return res.status(status.OK).send(csvData);
});

// 2. Athlete Hub (Flexible by ?tab=dash|goals-habits|training|reports|calendar|all)
const getAthleteHubController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.query.athleteId;
  const tab = req.query.tab || req.params.tab || 'dash';
  const result = await getAthleteHubService(athleteId, tab, req.query);
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
  const result = await getAthleteHubService(athleteId, 'calendar', req.query);
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


// 8. Admin Overview Dashboard
const getAdminDashboardOverviewController = catchAsync(async (req, res) => {
  const result = await getAdminDashboardOverviewService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminDashboardOverview',
      message: 'Admin dashboard overview retrieved successfully',
      data: result,
    })
  );
});

// 9. Admin Payments Management
const getAdminPaymentsController = catchAsync(async (req, res) => {
  if (req.query.export === 'csv') {
    const csvData = await exportAdminPaymentsCsvService(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_export.csv"');
    return res.status(status.OK).send(csvData);
  }

  const result = await getAdminPaymentsService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminPayments',
      message: 'Admin payments retrieved successfully',
      data: result,
    })
  );
});

const exportAdminPaymentsCsvController = catchAsync(async (req, res) => {
  const csvData = await exportAdminPaymentsCsvService(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payments_export.csv"');
  return res.status(status.OK).send(csvData);
});

const createAdminInvoiceController = catchAsync(async (req, res) => {
  const result = await createAdminInvoiceService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AdminInvoice',
      message: 'Invoice created successfully',
      data: result,
    })
  );
});

// 10. Admin Business Metrics
const getAdminBusinessMetricsController = catchAsync(async (req, res) => {
  if (req.query.export === 'csv') {
    const csvData = await exportAdminBusinessReportService(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="business_metrics_report.csv"');
    return res.status(status.OK).send(csvData);
  }

  const result = await getAdminBusinessMetricsService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminBusinessMetrics',
      message: 'Admin business metrics retrieved successfully',
      data: result,
    })
  );
});

const exportAdminBusinessReportController = catchAsync(async (req, res) => {
  const csvData = await exportAdminBusinessReportService(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="business_metrics_report.csv"');
  return res.status(status.OK).send(csvData);
});

// 11. Admin Notifications
const getAdminNotificationsController = catchAsync(async (req, res) => {
  const result = await getAdminNotificationsService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminNotifications',
      message: 'Admin notifications retrieved successfully',
      data: result,
    })
  );
});

const markAdminNotificationReadController = catchAsync(async (req, res) => {
  const result = await markAdminNotificationReadService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminNotification',
      message: 'Notification marked as read',
      data: result,
    })
  );
});

const markAllAdminNotificationsReadController = catchAsync(async (req, res) => {
  const result = await markAllAdminNotificationsReadService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminNotification',
      message: 'All notifications marked as read',
      data: result,
    })
  );
});

// 12. Admin Universal Top Bar Search
const getAdminUniversalSearchController = catchAsync(async (req, res) => {
  const result = await getAdminUniversalSearchService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminUniversalSearch',
      message: 'Search results retrieved successfully',
      data: result,
    })
  );
});

// 13. Create Athlete Habit from Hub (AM5)
const createAthleteHabitController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.body.athleteId;
  const result = await createAthleteHabitService(athleteId, req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Habit',
      message: 'Habit created successfully',
      data: result,
    })
  );
});

// 14. Create Athlete Event/Session from Hub (AM5)
const createAthleteEventController = catchAsync(async (req, res) => {
  const athleteId = req.params.athleteId || req.body.athleteId;
  const result = await createAthleteEventService(athleteId, req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Session',
      message: 'Event scheduled successfully',
      data: result,
    })
  );
});

module.exports = {
  getClientDirectoryController,
  exportClientDirectoryCsvController,
  getAthleteHubController,
  getAthleteDashTabController,
  getAthleteGoalsHabitsTabController,
  getAthleteTrainingTabController,
  getAthleteReportsTabController,
  getAthleteCalendarTabController,
  getAdminDashboardOverviewController,
  getAdminPaymentsController,
  createAdminInvoiceController,
  exportAdminPaymentsCsvController,
  getAdminBusinessMetricsController,
  exportAdminBusinessReportController,
  getAdminNotificationsController,
  markAdminNotificationReadController,
  markAllAdminNotificationsReadController,
  getAdminUniversalSearchController,
  createAthleteHabitController,
  createAthleteEventController,
};
