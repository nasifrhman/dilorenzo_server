const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getSessionsOverviewService,
  createSessionService,
  getSessionByIdService,
  updateSessionService,
  deleteSessionService,
} = require('./session.service');

const getSessionsOverviewController = catchAsync(async (req, res) => {
  const result = await getSessionsOverviewService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'SessionsOverview',
      message: 'Sessions & Admission Calls overview retrieved successfully',
      data: result,
    })
  );
});

const createSessionController = catchAsync(async (req, res) => {
  const result = await createSessionService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Session',
      message: 'Session scheduled successfully and calendar invites sent',
      data: result,
    })
  );
});

const getSessionByIdController = catchAsync(async (req, res) => {
  const result = await getSessionByIdService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Session',
      message: 'Session details retrieved successfully',
      data: result,
    })
  );
});

const updateSessionController = catchAsync(async (req, res) => {
  const result = await updateSessionService(req.params.id, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Session',
      message: 'Session updated successfully',
      data: result,
    })
  );
});

const deleteSessionController = catchAsync(async (req, res) => {
  const result = await deleteSessionService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Session',
      message: 'Session deleted successfully',
      data: result,
    })
  );
});

module.exports = {
  getSessionsOverviewController,
  createSessionController,
  getSessionByIdController,
  updateSessionController,
  deleteSessionController,
};
