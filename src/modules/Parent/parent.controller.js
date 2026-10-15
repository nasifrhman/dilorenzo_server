const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getParentHomepageService,
  getParentProgressService,
  getParentCoachHubService,
  sendParentCoachMessageService,
} = require('./parent.service');

const getParentHomepageController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = req.query.parentId || (currentUser?.role === 'parent' ? currentUser._id : null);
  const athleteId = req.query.athleteId || req.query.childId || req.params.athleteId || null;

  const result = await getParentHomepageService({ parentId, athleteId });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ParentHomepage',
      message: 'Parent homepage retrieved successfully',
      data: result,
    })
  );
});

const getParentProgressController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = req.query.parentId || (currentUser?.role === 'parent' ? currentUser._id : null);
  const athleteId = req.query.athleteId || req.query.childId || req.params.athleteId || null;
  const tab = req.query.tab ? req.query.tab.toLowerCase().trim() : null;

  const result = await getParentProgressService({ parentId, athleteId, tab });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ParentProgress',
      message: 'Parent athlete progress retrieved successfully',
      data: result,
    })
  );
});

const getParentCoachHubController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = req.query.parentId || (currentUser?.role === 'parent' ? currentUser._id : null);
  const athleteId = req.query.athleteId || req.query.childId || req.params.athleteId || null;
  const tab = req.query.tab ? req.query.tab.toLowerCase().trim() : null;

  const result = await getParentCoachHubService({ parentId, athleteId, tab });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ParentCoachHub',
      message: 'Parent coach hub retrieved successfully',
      data: result,
    })
  );
});

const sendParentCoachMessageController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = currentUser?._id;
  const athleteId = req.body.athleteId || req.query.athleteId || req.params.athleteId || null;
  const { content, messageType, mediaUrl, mediaDuration } = req.body;

  const result = await sendParentCoachMessageService({
    parentId,
    athleteId,
    content,
    messageType,
    mediaUrl,
    mediaDuration,
  });

  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'ParentCoachMessage',
      message: 'Message sent successfully to coach 3-way chat',
      data: result,
    })
  );
});

module.exports = {
  getParentHomepageController,
  getParentProgressController,
  getParentCoachHubController,
  sendParentCoachMessageController,
};
